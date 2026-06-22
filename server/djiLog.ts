/**
 * Parser para logs DJI decodificados.
 *
 * Aceita dois formatos:
 *
 * 1. CSV exportado por Phantom Help (https://www.phantomhelp.com/LogViewer/) e
 *    Airdata. Espera ao menos as colunas: latitude, longitude, altitude,
 *    speed (opcional) e um carimbo de tempo (CUSTOM.updateTime, time(millisecond),
 *    datetime(utc) etc).
 *
 * 2. KML exportado por DJI Flight Reader, contendo um <LineString><coordinates>
 *    com triplas "lng,lat,alt" separadas por espaço.
 *
 * O parser é tolerante a variações de capitalização e nomes de colunas comuns.
 */

export type TrajectoryPoint = {
  t: number; // unix ms; 0 se desconhecido
  lat: number;
  lng: number;
  alt: number; // metros acima do takeoff (ou altitude WGS84 quando KML)
  speed?: number; // m/s
  // Telemetria detalhada (disponível em DJI TXT; opcional para CSV/KML)
  altMsl?: number; // altitude MSL (m)
  vps?: number; // altura por sensor de visão (m)
  battery?: number; // nível de carga (%)
  voltage?: number; // tensão (V)
  batTemp?: number; // temperatura da bateria (°C)
  gpsNum?: number; // número de satélites GPS
  rcUp?: number; // sinal de uplink do RC (%)
  rcDown?: number; // sinal de downlink do RC (%)
  vSpeed?: number; // velocidade vertical (m/s)
  heading?: number; // yaw / rumo (°)
};

export type ParsedActualFlight = {
  flightName: string;
  droneModel: string | null;
  sourceFormat: "csv" | "kml" | "dji-txt";
  startedAt: string | null;
  endedAt: string | null;
  flightDate: string | null; // YYYY-MM-DD
  durationSeconds: number;
  distanceMeters: number;
  maxAltitudeMeters: number;
  maxSpeedMs: number; // m/s
  pointsCount: number;
  trajectory: TrajectoryPoint[];
};

export type ValidationResult =
  | { ok: true; data: ParsedActualFlight }
  | { ok: false; error: string };

// ---------- Helpers ----------

function haversine(a: TrajectoryPoint, b: TrajectoryPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function computeStats(points: TrajectoryPoint[]): {
  durationSeconds: number;
  distanceMeters: number;
  maxAltitudeMeters: number;
  maxSpeedMs: number;
  startedAt: string | null;
  endedAt: string | null;
  flightDate: string | null;
} {
  if (points.length === 0) {
    return {
      durationSeconds: 0,
      distanceMeters: 0,
      maxAltitudeMeters: 0,
      maxSpeedMs: 0,
      startedAt: null,
      endedAt: null,
      flightDate: null,
    };
  }

  let distance = 0;
  let maxAlt = -Infinity;
  let maxSpeed = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.alt > maxAlt) maxAlt = p.alt;
    if (p.speed !== undefined && p.speed > maxSpeed) maxSpeed = p.speed;
    if (i > 0) distance += haversine(points[i - 1], p);
  }

  const first = points[0];
  const last = points[points.length - 1];
  const hasTime = first.t > 0 && last.t > 0;
  const duration = hasTime ? Math.max(0, Math.round((last.t - first.t) / 1000)) : 0;
  const startedAt = hasTime ? new Date(first.t).toISOString() : null;
  const endedAt = hasTime ? new Date(last.t).toISOString() : null;
  const flightDate = hasTime ? new Date(first.t).toISOString().slice(0, 10) : null;

  return {
    durationSeconds: duration,
    distanceMeters: Math.round(distance),
    maxAltitudeMeters: Math.round(maxAlt === -Infinity ? 0 : maxAlt),
    maxSpeedMs: maxSpeed,
    startedAt,
    endedAt,
    flightDate,
  };
}

function parseNumber(v: string | undefined): number | null {
  if (v === undefined || v === null) return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseTimestamp(v: string | undefined): number {
  if (!v) return 0;
  const trimmed = v.trim();
  if (!trimmed) return 0;
  // Numeric epoch (ms or s)
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber > 1e12 ? asNumber : asNumber * 1000;
  }
  // ISO / datetime
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

// ---------- CSV parser ----------

function splitCsvLine(line: string): string[] {
  // Suporta campos entre aspas com vírgulas internas
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate.toLowerCase());
    if (idx >= 0) return idx;
  }
  // tentativa parcial
  for (const candidate of candidates) {
    const idx = normalized.findIndex((h) => h.includes(candidate.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseCsv(content: string, fileName: string): ValidationResult {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { ok: false, error: "CSV vazio ou sem linhas de dados." };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const latIdx = findColumn(headers, [
    "latitude",
    "osd.latitude",
    "gps.latitude",
    "lat",
  ]);
  const lngIdx = findColumn(headers, [
    "longitude",
    "osd.longitude",
    "gps.longitude",
    "lng",
    "lon",
  ]);
  if (latIdx < 0 || lngIdx < 0) {
    return {
      ok: false,
      error:
        "CSV não contém colunas de latitude e longitude. Verifique se o arquivo foi exportado pelo Phantom Help (https://www.phantomhelp.com/LogViewer) ou Airdata.",
    };
  }

  const altIdx = findColumn(headers, [
    "altitude(feet)",
    "altitude_above_seaLevel(feet)",
    "altitude(meters)",
    "height_above_takeoff(feet)",
    "height_above_takeoff(meters)",
    "altitude",
    "osd.altitude",
    "osd.height",
    "height",
  ]);
  const speedIdx = findColumn(headers, [
    "speed(mph)",
    "speed(m/s)",
    "speed(kph)",
    "osd.xspeed",
    "speed",
  ]);
  const timeIdx = findColumn(headers, [
    "datetime(utc)",
    "custom.updatetime",
    "time(milli)",
    "time(millisecond)",
    "datetime",
    "time",
    "gps.dateTimeStamp",
    "timestamp",
  ]);

  const altIsFeet = altIdx >= 0 && /feet|ft/i.test(headers[altIdx]);
  const speedHeader = speedIdx >= 0 ? headers[speedIdx].toLowerCase() : "";
  const speedIsMph = /mph/.test(speedHeader);
  const speedIsKph = /kph|km\/?h/.test(speedHeader);

  const points: TrajectoryPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const lat = parseNumber(cols[latIdx]);
    const lng = parseNumber(cols[lngIdx]);
    if (lat === null || lng === null) continue;
    if (lat === 0 && lng === 0) continue;

    let alt = altIdx >= 0 ? parseNumber(cols[altIdx]) ?? 0 : 0;
    if (altIsFeet) alt = alt * 0.3048;

    let speed = speedIdx >= 0 ? parseNumber(cols[speedIdx]) ?? undefined : undefined;
    if (speed !== undefined) {
      if (speedIsMph) speed = speed * 0.44704;
      else if (speedIsKph) speed = speed / 3.6;
    }

    const t = timeIdx >= 0 ? parseTimestamp(cols[timeIdx]) : 0;
    points.push({ t, lat, lng, alt, speed });
  }

  if (points.length < 2) {
    return { ok: false, error: "CSV não contém pontos de trajetória válidos." };
  }

  const stats = computeStats(points);
  return {
    ok: true,
    data: {
      flightName: fileName.replace(/\.[^.]+$/, ""),
      droneModel: null,
      sourceFormat: "csv",
      pointsCount: points.length,
      trajectory: points,
      ...stats,
    },
  };
}

// ---------- KML parser ----------

export function parseKml(content: string, fileName: string): ValidationResult {
  if (!/<kml/i.test(content)) {
    return { ok: false, error: "Arquivo KML inválido (tag <kml> ausente)." };
  }

  // Captura blocos <coordinates>...</coordinates>
  const coordsMatches = Array.from(
    content.matchAll(/<coordinates>([\s\S]*?)<\/coordinates>/gi)
  );
  if (coordsMatches.length === 0) {
    return { ok: false, error: "Nenhum bloco <coordinates> encontrado no KML." };
  }

  // Pega o bloco mais longo (geralmente o trajeto principal)
  let best = coordsMatches[0][1];
  for (const m of coordsMatches) {
    if (m[1].length > best.length) best = m[1];
  }

  const tokens = best
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  // Tenta extrair timestamps de <when> tags (gx:Track)
  const whenMatches = Array.from(content.matchAll(/<when>([^<]+)<\/when>/gi));
  const whens = whenMatches.map((m) => parseTimestamp(m[1]));

  const points: TrajectoryPoint[] = [];
  tokens.forEach((tok, idx) => {
    const parts = tok.split(",").map((p) => parseNumber(p));
    if (parts.length < 2 || parts[0] === null || parts[1] === null) return;
    const lng = parts[0];
    const lat = parts[1];
    const alt = parts[2] ?? 0;
    if (lat === 0 && lng === 0) return;
    const t = whens[idx] ?? 0;
    points.push({ t, lat, lng, alt });
  });

  if (points.length < 2) {
    return { ok: false, error: "KML não contém pontos de trajetória suficientes." };
  }

  // Tenta extrair o nome do voo da tag <name>
  const nameMatch = content.match(/<name>([^<]+)<\/name>/i);
  const flightName = nameMatch
    ? nameMatch[1].trim()
    : fileName.replace(/\.[^.]+$/, "");

  const stats = computeStats(points);
  return {
    ok: true,
    data: {
      flightName,
      droneModel: null,
      sourceFormat: "kml",
      pointsCount: points.length,
      trajectory: points,
      ...stats,
    },
  };
}

// ---------- .log handler ----------

/**
 * Heurística para detectar se um conteúdo parece binário (criptografado).
 * Verifica a proporção de bytes não-imprimíveis nos primeiros KB.
 */
function looksBinary(content: string): boolean {
  const sample = content.slice(0, 4096);
  if (sample.length === 0) return false;
  let nonPrintable = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    // \t \n \r e printable ASCII (32–126) são ok; latin-1 (160–255) também
    const ok =
      code === 9 ||
      code === 10 ||
      code === 13 ||
      (code >= 32 && code <= 126) ||
      (code >= 160 && code <= 255);
    if (!ok) nonPrintable++;
  }
  return nonPrintable / sample.length > 0.15;
}

export function parseDjiLog(content: string, fileName: string): ValidationResult {
  // Caso 1: .log já é texto camuflado (alguns DJI Pilot exportam CSV com extensão .log)
  if (!looksBinary(content)) {
    if (/<kml/i.test(content)) return parseKml(content, fileName);
    const firstLine = content.split(/\r?\n/)[0] ?? "";
    if (/[,;\t]/.test(firstLine)) {
      const csvResult = parseCsv(content, fileName);
      if (csvResult.ok) return csvResult;
    }
  }

  // Caso 2: binário criptografado — fallback orientado
  return {
    ok: false,
    error:
      "Os arquivos .log brutos do DJI Fly/Pilot são criptografados e exigem decodificação prévia. Acesse https://www.phantomhelp.com/LogViewer/ ou https://app.airdata.com, faça upload do .log, exporte como CSV ou KML e tente novamente. (Tamanho: " +
      content.length +
      " bytes)",
  };
}

// ---------- DJI Fly TXT (binário, criptografado v13+) ----------

/**
 * Detecta se um Buffer parece um DJI Fly TXT (FlightRecord_*.txt).
 * Heurística: começa com prefix offset (uint32 LE pequeno-médio) seguido de
 * bytes binários, e não é KML/CSV em texto.
 */
export function looksLikeDjiTxt(buf: Buffer): boolean {
  if (buf.length < 100) return false;
  // Os primeiros bytes do header são um offset uint32 LE para o detail area.
  // Em arquivos reais costuma ser um valor positivo razoável (< tamanho do arquivo).
  const headerOffset = buf.readUInt32LE(0);
  if (headerOffset <= 0 || headerOffset > buf.length) return false;
  // Não deve ser texto legível no início (KML/CSV).
  const head = buf.subarray(0, 16).toString("latin1");
  if (/<\?xml|<kml|,/.test(head)) return false;
  return true;
}

function round(n: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * Decodifica um DJI Fly TXT criptografado usando dji-log-parser-js.
 * Requer DJI_API_KEY para buscar os keychains (logs v13+).
 */
export async function parseDjiTxt(
  buf: Buffer,
  fileName: string,
  apiKey: string | undefined
): Promise<ValidationResult> {
  let DJILog: any;
  try {
    const mod: any = await import("dji-log-parser-js");
    DJILog = mod.DJILog;
  } catch (e) {
    return {
      ok: false,
      error: "Biblioteca de decodificação DJI indisponível no servidor.",
    };
  }

  let log: any;
  let version = 0;
  let details: any = {};
  try {
    log = new DJILog(new Uint8Array(buf));
    version = log.version;
    details = log.details ?? {};
  } catch (e: any) {
    return {
      ok: false,
      error:
        "Não foi possível ler o arquivo DJI Fly TXT. Ele pode estar corrompido ou não ser um FlightRecord válido.",
    };
  }

  // Logs v13+ exigem keychains (descriptografia) via DJI API Key.
  let frames: any[] = [];
  try {
    if (version >= 13) {
      if (!apiKey) {
        return {
          ok: false,
          error:
            "Este arquivo DJI Fly TXT (versão " +
            version +
            ") é criptografado e requer uma DJI API Key configurada no servidor para ser decodificado. Configure a chave em Configurações → Secrets (DJI_API_KEY) ou use um CSV/KML decodificado pelo Phantom Help.",
        };
      }
      const keychains = await log.fetchKeychains(apiKey);
      frames = log.frames(keychains);
    } else {
      frames = log.frames();
    }
  } catch (e: any) {
    return {
      ok: false,
      error:
        "Falha ao decodificar o arquivo DJI. Verifique se a DJI API Key é válida (app Open API ativado). Detalhe: " +
        (e?.message || "erro desconhecido") +
        ".",
    };
  }

  if (!Array.isArray(frames) || frames.length === 0) {
    return { ok: false, error: "Nenhum quadro de telemetria encontrado no arquivo DJI." };
  }

  // Constrói a trajetória a partir dos frames normalizados.
  const points: TrajectoryPoint[] = [];
  let startMs = 0;
  for (const f of frames) {
    const osd = f?.osd;
    if (!osd) continue;
    const lat = osd.latitude;
    const lng = osd.longitude;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      (lat === 0 && lng === 0)
    ) {
      continue;
    }
    const iso = f?.custom?.dateTime;
    const t = iso ? Date.parse(iso) : 0;
    if (startMs === 0 && t > 0) startMs = t;
    const xs = typeof osd.xSpeed === "number" ? osd.xSpeed : 0;
    const ys = typeof osd.ySpeed === "number" ? osd.ySpeed : 0;
    const zs = typeof osd.zSpeed === "number" ? osd.zSpeed : 0;
    const speed = Math.sqrt(xs * xs + ys * ys + zs * zs);
    const bat = f?.battery;
    const rc = f?.rc;
    const num = (v: unknown): number | undefined =>
      typeof v === "number" && Number.isFinite(v) ? round(v) : undefined;
    points.push({
      t: Number.isFinite(t) ? t : 0,
      lat,
      lng,
      alt: typeof osd.height === "number" ? round(osd.height) : 0,
      speed: round(speed),
      altMsl: num(osd.altitude),
      vps: num(osd.vpsHeight),
      vSpeed: num(zs),
      heading: num(osd.yaw),
      gpsNum: num(osd.gpsNum),
      battery: num(bat?.chargeLevel),
      voltage: num(bat?.voltage),
      batTemp: num(bat?.temperature),
      rcUp: num(rc?.uplinkSignal),
      rcDown: num(rc?.downlinkSignal),
    });
  }

  if (points.length === 0) {
    return {
      ok: false,
      error: "O arquivo foi decodificado, mas não contém coordenadas GPS válidas.",
    };
  }

  const stats = computeStats(points);

  // Prefere metadados do header (mais precisos) quando disponíveis.
  const durationSeconds =
    typeof details.totalTime === "number" && details.totalTime > 0
      ? Math.round(details.totalTime)
      : stats.durationSeconds;
  const maxAltitudeMeters =
    typeof details.maxHeight === "number" && details.maxHeight > 0
      ? Math.round(details.maxHeight)
      : stats.maxAltitudeMeters;
  const maxSpeedMs =
    typeof details.maxHorizontalSpeed === "number" && details.maxHorizontalSpeed > stats.maxSpeedMs
      ? round(details.maxHorizontalSpeed)
      : stats.maxSpeedMs;
  // totalDistance do header vem em km em alguns firmwares; usa o cálculo por haversine como fonte confiável.
  const distanceMeters = stats.distanceMeters;

  const startedAt =
    stats.startedAt ?? (details.startTime ? new Date(details.startTime).toISOString() : null);
  const flightDate = startedAt ? startedAt.slice(0, 10) : null;

  return {
    ok: true,
    data: {
      flightName: fileName.replace(/\.[^.]+$/, ""),
      droneModel: typeof details.aircraftName === "string" ? details.aircraftName : null,
      sourceFormat: "dji-txt",
      startedAt,
      endedAt: stats.endedAt,
      flightDate,
      durationSeconds,
      distanceMeters,
      maxAltitudeMeters,
      maxSpeedMs,
      pointsCount: points.length,
      trajectory: points,
    },
  };
}

// ---------- Entrada principal ----------

/**
 * Versão síncrona, mantida para CSV/KML/texto.
 */
export function parseActualFlight(
  content: string,
  fileName: string
): ValidationResult {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".kml")) {
    return parseKml(content, fileName);
  }
  if (lower.endsWith(".csv")) {
    return parseCsv(content, fileName);
  }
  if (lower.endsWith(".log") || lower.endsWith(".txt")) {
    return parseDjiLog(content, fileName);
  }
  // tentativa por conteúdo
  if (/<kml/i.test(content)) return parseKml(content, fileName);
  if (/,/.test(content.split(/\r?\n/)[0] ?? "")) return parseCsv(content, fileName);
  return {
    ok: false,
    error:
      "Formato não reconhecido. Aceitamos CSV (Phantom Help / Airdata), KML (DJI Flight Reader) e .log/.txt (texto).",
  };
}

/**
 * Entrada unificada e assíncrona. Aceita:
 *  - `content` (string) para CSV/KML/.log/.txt em texto legível
 *  - `binaryBase64` (string base64) para DJI Fly TXT binário (FlightRecord_*.txt)
 *
 * Quando recebe binário, detecta DJI TXT e o decodifica via dji-log-parser-js
 * (usando a apiKey quando o log for v13+).
 */
export async function parseActualFlightAsync(opts: {
  content?: string;
  binaryBase64?: string;
  fileName: string;
  apiKey?: string;
}): Promise<ValidationResult> {
  const { content, binaryBase64, fileName, apiKey } = opts;

  // 1) Caso binário: tenta DJI Fly TXT
  if (binaryBase64) {
    const buf = Buffer.from(binaryBase64, "base64");
    if (looksLikeDjiTxt(buf)) {
      return await parseDjiTxt(buf, fileName, apiKey);
    }
    // Talvez seja texto enviado como base64 (ex.: CSV/KML grande). Tenta decodificar como UTF-8.
    const asText = buf.toString("utf8");
    if (!looksBinary(asText)) {
      return parseActualFlight(asText, fileName);
    }
    return {
      ok: false,
      error:
        "Arquivo binário não reconhecido. Para DJI Fly TXT (FlightRecord_*.txt) a decodificação requer DJI API Key válida. Também aceitamos CSV/KML decodificados pelo Phantom Help.",
    };
  }

  // 2) Caso texto
  if (typeof content === "string") {
    return parseActualFlight(content, fileName);
  }

  return { ok: false, error: "Nenhum conteúdo fornecido para importação." };
}
