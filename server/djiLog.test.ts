import { describe, expect, it } from "vitest";
import { parseActualFlight, parseCsv, parseKml } from "./djiLog";

const PHANTOM_HELP_CSV = `CUSTOM.updateTime,OSD.latitude,OSD.longitude,OSD.height,OSD.xSpeed
2024-08-12 10:00:00.000,-22.123456,-43.654321,0,0
2024-08-12 10:00:01.000,-22.123500,-43.654400,2.5,1.2
2024-08-12 10:00:02.000,-22.123600,-43.654500,5.0,2.5
2024-08-12 10:00:03.000,-22.123700,-43.654600,8.0,3.1
2024-08-12 10:00:10.000,-22.123900,-43.654800,12.0,4.0
`;

const AIRDATA_CSV_WITH_FEET = `time(millisecond),latitude,longitude,altitude(feet),speed(mph)
0,-22.123456,-43.654321,0,0
1000,-22.123500,-43.654400,32.8,5.0
2000,-22.123600,-43.654500,65.6,10.0
`;

const KML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Voo Mavic 3</name>
    <Placemark>
      <LineString>
        <coordinates>
          -43.654321,-22.123456,0
          -43.654400,-22.123500,2.5
          -43.654500,-22.123600,5.0
          -43.654600,-22.123700,8.0
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

describe("parseCsv (Phantom Help / Airdata)", () => {
  it("parses a Phantom Help style CSV with datetime and metric units", () => {
    const result = parseCsv(PHANTOM_HELP_CSV, "voo-teste.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sourceFormat).toBe("csv");
    expect(result.data.pointsCount).toBe(5);
    expect(result.data.trajectory[0].lat).toBeCloseTo(-22.123456, 5);
    expect(result.data.trajectory[0].lng).toBeCloseTo(-43.654321, 5);
    expect(result.data.maxAltitudeMeters).toBe(12);
    expect(result.data.durationSeconds).toBe(10);
    expect(result.data.flightDate).toBe("2024-08-12");
    expect(result.data.distanceMeters).toBeGreaterThan(0);
  });

  it("converts feet to meters and mph to m/s when units are explicit", () => {
    const result = parseCsv(AIRDATA_CSV_WITH_FEET, "airdata.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 65.6 feet ~= 20 meters
    expect(result.data.maxAltitudeMeters).toBeGreaterThanOrEqual(19);
    expect(result.data.maxAltitudeMeters).toBeLessThanOrEqual(21);
    // 10 mph ~= 4.47 m/s
    expect(result.data.maxSpeedMs).toBeGreaterThan(4);
    expect(result.data.maxSpeedMs).toBeLessThan(5);
  });

  it("rejects CSV without latitude/longitude columns", () => {
    const bad = `foo,bar\n1,2\n3,4`;
    const result = parseCsv(bad, "ruim.csv");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.toLowerCase()).toContain("latitude");
  });

  it("rejects empty CSV", () => {
    const result = parseCsv("", "vazio.csv");
    expect(result.ok).toBe(false);
  });

  it("skips lines with lat=0 lng=0 (GPS not fixed)", () => {
    const csv = `latitude,longitude,altitude\n0,0,0\n-22.1,-43.6,10\n-22.2,-43.7,15`;
    const result = parseCsv(csv, "zeros.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.pointsCount).toBe(2);
  });
});

describe("parseKml (DJI Flight Reader)", () => {
  it("parses a KML LineString into points and extracts the flight name", () => {
    const result = parseKml(KML_SAMPLE, "voo.kml");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sourceFormat).toBe("kml");
    expect(result.data.flightName).toBe("Voo Mavic 3");
    expect(result.data.pointsCount).toBe(4);
    expect(result.data.trajectory[0].lat).toBeCloseTo(-22.123456, 5);
    expect(result.data.trajectory[0].lng).toBeCloseTo(-43.654321, 5);
    expect(result.data.maxAltitudeMeters).toBe(8);
  });

  it("rejects content without <kml> tag", () => {
    const result = parseKml("<svg/>", "fake.kml");
    expect(result.ok).toBe(false);
  });

  it("rejects KML without coordinates", () => {
    const result = parseKml(`<kml><Document></Document></kml>`, "vazio.kml");
    expect(result.ok).toBe(false);
  });
});

describe("parseActualFlight (entry point)", () => {
  it("routes .csv files to the CSV parser", () => {
    const result = parseActualFlight(PHANTOM_HELP_CSV, "log.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sourceFormat).toBe("csv");
  });

  it("routes .kml files to the KML parser", () => {
    const result = parseActualFlight(KML_SAMPLE, "log.kml");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sourceFormat).toBe("kml");
  });

  it("rejects unknown content", () => {
    const result = parseActualFlight("conteúdo aleatório sem formato", "qualquer.txt");
    expect(result.ok).toBe(false);
  });
});


describe("parseActualFlight com .log e .txt", () => {
  it("aceita .log de texto camuflado como CSV (DJI Pilot)", () => {
    const result = parseActualFlight(PHANTOM_HELP_CSV, "voo-bruto.log");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sourceFormat).toBe("csv");
    expect(result.data.pointsCount).toBeGreaterThanOrEqual(4);
  });

  it("aceita .txt com KML embutido", () => {
    const result = parseActualFlight(KML_SAMPLE, "voo.txt");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sourceFormat).toBe("kml");
  });

  it("rejeita .log binário criptografado com mensagem orientada (Phantom Help)", () => {
    // Simula bytes binários: ~30% non-printable
    let binary = "";
    for (let i = 0; i < 2000; i++) {
      // Mistura caracteres de controle (0x00–0x08) com algum ASCII legível
      binary += i % 3 === 0 ? String.fromCharCode(i % 8) : String.fromCharCode(65 + (i % 26));
    }
    const result = parseActualFlight(binary, "2026_05_30@06_45_00.log");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/criptografados|phantomhelp|airdata/i);
  });

  it("retorna mensagem clara para extensão não suportada", () => {
    const result = parseActualFlight("conteudo qualquer", "voo.bin");
    expect(result.ok).toBe(false);
  });
});


import { readFileSync, existsSync } from "node:fs";
import { looksLikeDjiTxt, parseActualFlightAsync } from "./djiLog";

const DJI_TXT_PATH = "/home/ubuntu/upload/FlightRecord_2026-05-24_[10-55-37].txt";

describe("looksLikeDjiTxt", () => {
  it("detecta um FlightRecord_*.txt binário real como DJI TXT", () => {
    if (!existsSync(DJI_TXT_PATH)) return; // ambiente sem o arquivo de amostra
    const buf = readFileSync(DJI_TXT_PATH);
    expect(looksLikeDjiTxt(buf)).toBe(true);
  });

  it("não confunde CSV/KML de texto com DJI TXT", () => {
    expect(looksLikeDjiTxt(Buffer.from(KML_SAMPLE, "utf8"))).toBe(false);
    expect(looksLikeDjiTxt(Buffer.from(PHANTOM_HELP_CSV, "utf8"))).toBe(false);
  });

  it("rejeita buffers muito curtos", () => {
    expect(looksLikeDjiTxt(Buffer.from([1, 2, 3]))).toBe(false);
  });
});

describe("parseActualFlightAsync", () => {
  it("processa CSV via campo content (texto)", async () => {
    const result = await parseActualFlightAsync({
      content: PHANTOM_HELP_CSV,
      fileName: "voo.csv",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sourceFormat).toBe("csv");
  });

  it("processa CSV enviado como base64 (texto camuflado em binaryBase64)", async () => {
    const b64 = Buffer.from(PHANTOM_HELP_CSV, "utf8").toString("base64");
    const result = await parseActualFlightAsync({
      binaryBase64: b64,
      fileName: "voo.csv",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sourceFormat).toBe("csv");
  });

  it("retorna erro quando nada é fornecido", async () => {
    const result = await parseActualFlightAsync({ fileName: "x.txt" });
    expect(result.ok).toBe(false);
  });

  it("exige DJI API Key para DJI TXT v13+ quando a chave está ausente", async () => {
    if (!existsSync(DJI_TXT_PATH)) return;
    const buf = readFileSync(DJI_TXT_PATH);
    const result = await parseActualFlightAsync({
      binaryBase64: buf.toString("base64"),
      fileName: "FlightRecord.txt",
      apiKey: undefined,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/API Key|criptografad/i);
  });

  // Teste de integração real: só roda quando DJI_API_KEY estiver presente.
  it(
    "decodifica a trajetória real do FlightRecord com DJI API Key válida",
    async () => {
      const apiKey = process.env.DJI_API_KEY;
      if (!apiKey || !existsSync(DJI_TXT_PATH)) return; // pula se não houver chave/arquivo
      const buf = readFileSync(DJI_TXT_PATH);
      const result = await parseActualFlightAsync({
        binaryBase64: buf.toString("base64"),
        fileName: "FlightRecord_2026-05-24_[10-55-37].txt",
        apiKey,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.sourceFormat).toBe("dji-txt");
      expect(result.data.droneModel).toContain("DJI");
      expect(result.data.pointsCount).toBeGreaterThan(100);
      // Trajetória / takeoff: o primeiro ponto é a decolagem (hemisfério sul, lat < 0)
      expect(result.data.trajectory[0].lat).toBeLessThan(0);
      expect(result.data.trajectory[0].lng).toBeLessThan(0);
      // Estatísticas derivadas dos frames + header
      expect(result.data.durationSeconds).toBeGreaterThan(0);
      expect(result.data.distanceMeters).toBeGreaterThan(0);
      expect(result.data.maxAltitudeMeters).toBeGreaterThan(0);
      expect(result.data.maxSpeedMs).toBeGreaterThan(0);
      // Datas coerentes
      expect(result.data.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.data.flightDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Telemetria detalhada deve estar presente ao longo da trajetória em DJI TXT.
      // Cada campo é verificado de forma independente, pois um mesmo frame pode
      // não conter todas as fontes simultaneamente.
      const traj = result.data.trajectory;
      const batt = traj.find((p) => p.battery !== undefined);
      expect(batt).toBeDefined();
      expect(batt!.battery!).toBeGreaterThanOrEqual(0);
      expect(batt!.battery!).toBeLessThanOrEqual(100);
      expect(traj.some((p) => (p.gpsNum ?? 0) > 0)).toBe(true);
      expect(traj.some((p) => typeof p.batTemp === "number")).toBe(true);
      expect(traj.some((p) => typeof p.altMsl === "number")).toBe(true);
      expect(traj.some((p) => typeof p.rcUp === "number")).toBe(true);
    },
    60000
  );

  it(
    "retorna mensagem orientada quando a DJI API Key é inválida (403)",
    async () => {
      if (!existsSync(DJI_TXT_PATH)) return;
      const buf = readFileSync(DJI_TXT_PATH);
      const result = await parseActualFlightAsync({
        binaryBase64: buf.toString("base64"),
        fileName: "FlightRecord_2026-05-24_[10-55-37].txt",
        apiKey: "chave-invalida-para-teste-403",
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      // A mensagem deve orientar sobre a validade da chave (app Open API ativado).
      expect(result.error).toMatch(/API Key|Open API|decodificar|inválid/i);
    },
    60000
  );
});
