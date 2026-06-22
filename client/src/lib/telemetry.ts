/**
 * Utilitários puros (testáveis) para estatísticas e amostragem de telemetria.
 * Usados pela exportação de PDF na página de detalhe do voo realizado.
 * NÃO alteram a trajetória nem a lógica de importação — apenas leem os pontos.
 */

import type { PlaybackPoint } from "./playback";

export type TelemetryField =
  | "alt"
  | "altMsl"
  | "speed"
  | "vSpeed"
  | "vps"
  | "battery"
  | "voltage"
  | "batTemp"
  | "gpsNum"
  | "rcUp"
  | "rcDown"
  | "heading";

export type FieldStat = {
  field: TelemetryField;
  min: number;
  max: number;
  avg: number;
  count: number;
};

/** Verifica se um valor numérico é utilizável (finito e não nulo/indefinido). */
function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Calcula mínimo, máximo e média de um campo de telemetria sobre TODOS os pontos.
 * Retorna `null` quando o campo não tem nenhuma amostra válida.
 */
export function computeFieldStat(
  points: PlaybackPoint[],
  field: TelemetryField,
): FieldStat | null {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  for (const p of points) {
    const v = (p as Record<string, unknown>)[field];
    if (isNum(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      count += 1;
    }
  }
  if (count === 0) return null;
  return { field, min, max, avg: sum / count, count };
}

/**
 * Determina quais campos de telemetria estão presentes em ao menos um ponto,
 * preservando uma ordem de exibição estável.
 */
export function presentFields(points: PlaybackPoint[]): TelemetryField[] {
  const order: TelemetryField[] = [
    "alt",
    "altMsl",
    "speed",
    "vSpeed",
    "vps",
    "battery",
    "voltage",
    "batTemp",
    "gpsNum",
    "rcUp",
    "rcDown",
    "heading",
  ];
  return order.filter((f) => points.some((p) => isNum((p as Record<string, unknown>)[f])));
}

/**
 * Amostra os pontos a um número máximo de linhas usando intervalo regular,
 * garantindo que o primeiro e o último ponto estejam sempre presentes.
 * Quando `maxRows <= 0` ou maior que o total, retorna todos os pontos.
 */
export function sampleTrajectory<T>(points: T[], maxRows: number): T[] {
  const total = points.length;
  if (total === 0) return [];
  if (maxRows <= 0 || total <= maxRows) return points.slice();
  const step = (total - 1) / (maxRows - 1);
  const out: T[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < maxRows; i++) {
    const idx = Math.round(i * step);
    const clamped = Math.min(total - 1, Math.max(0, idx));
    if (!seen.has(clamped)) {
      seen.add(clamped);
      out.push(points[clamped]);
    }
  }
  // Garante o último ponto.
  if (!seen.has(total - 1)) out.push(points[total - 1]);
  return out;
}

/** Rótulo legível (pt-BR) para cada campo de telemetria. */
export const FIELD_LABEL: Record<TelemetryField, string> = {
  alt: "Alt. rel.",
  altMsl: "Alt. MSL",
  speed: "Velocidade",
  vSpeed: "Vel. vert.",
  vps: "VPS",
  battery: "Bateria",
  voltage: "Tensão",
  batTemp: "Temp. bat.",
  gpsNum: "Satélites",
  rcUp: "RC ↑",
  rcDown: "RC ↓",
  heading: "Proa",
};

/** Unidade de cada campo (para sufixar valores no PDF). */
export const FIELD_UNIT: Record<TelemetryField, string> = {
  alt: "m",
  altMsl: "m",
  speed: "m/s",
  vSpeed: "m/s",
  vps: "m",
  battery: "%",
  voltage: "V",
  batTemp: "°C",
  gpsNum: "",
  rcUp: "%",
  rcDown: "%",
  heading: "°",
};

/** Casas decimais por campo. */
export const FIELD_DECIMALS: Record<TelemetryField, number> = {
  alt: 1,
  altMsl: 1,
  speed: 1,
  vSpeed: 1,
  vps: 1,
  battery: 0,
  voltage: 2,
  batTemp: 1,
  gpsNum: 0,
  rcUp: 0,
  rcDown: 0,
  heading: 1,
};

/** Formata um valor numérico de telemetria conforme casas decimais do campo. */
export function formatFieldValue(field: TelemetryField, value: unknown): string {
  if (!isNum(value)) return "—";
  return value.toFixed(FIELD_DECIMALS[field]);
}

/** Tempo decorrido (mm:ss) a partir do timestamp do ponto e do t0 da trajetória. */
export function elapsedClock(t: number | undefined, t0: number | undefined): string {
  if (!isNum(t) || !isNum(t0) || t0 <= 0) return "—";
  const ms = Math.max(0, t - t0);
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
