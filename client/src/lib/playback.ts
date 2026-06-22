/**
 * Utilitários puros para o playback temporal da trajetória.
 * Mantidos fora do componente para serem testáveis de forma isolada.
 */

export type PlaybackPoint = {
  t?: number;
  lat: number;
  lng: number;
  alt?: number;
  speed?: number;
  altMsl?: number;
  vps?: number;
  battery?: number;
  voltage?: number;
  batTemp?: number;
  gpsNum?: number;
  rcUp?: number;
  rcDown?: number;
  vSpeed?: number;
  heading?: number;
};

/** Formata milissegundos como mm:ss. */
export function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Calcula o tempo decorrido (ms) até o índice atual.
 * Usa timestamps reais quando disponíveis; caso contrário estima ~10 amostras/seg.
 */
export function elapsedAtIndex(points: PlaybackPoint[], index: number): number {
  const total = points.length;
  if (total === 0) return 0;
  const i = Math.min(Math.max(0, index), total - 1);
  const t0 = points[0]?.t ?? 0;
  const tc = points[i]?.t ?? 0;
  if (t0 > 0 && tc > 0) return Math.max(0, tc - t0);
  return (i / Math.max(1, total - 1)) * (total / 10) * 1000;
}

/** Duração total (ms) da trajetória. */
export function totalDuration(points: PlaybackPoint[]): number {
  const total = points.length;
  if (total < 2) return 0;
  const t0 = points[0]?.t ?? 0;
  const tn = points[total - 1]?.t ?? 0;
  if (t0 > 0 && tn > 0) return Math.max(0, tn - t0);
  return (total / 10) * 1000;
}

/** Filtra pontos com coordenadas finitas (válidas para o mapa). */
export function validTrajectory(points: PlaybackPoint[]): PlaybackPoint[] {
  return points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}
