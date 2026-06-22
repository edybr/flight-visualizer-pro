/**
 * Utilitários de período para o painel administrativo.
 *
 * Funções puras e testáveis que resolvem presets ("hoje", "últimos 7 dias", etc.) em um
 * intervalo [start, end) absoluto, além do período anterior comparável (para crescimento %).
 *
 * Todas as datas são tratadas em UTC com base em um "agora" injetável, mantendo as funções
 * determinísticas e fáceis de testar.
 */

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "last90"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export interface PeriodRange {
  /** Início inclusivo (timestamp ms). */
  start: number;
  /** Fim exclusivo (timestamp ms). */
  end: number;
}

export interface ResolvedPeriod extends PeriodRange {
  /** Período imediatamente anterior, de mesma duração, para comparação de crescimento. */
  previous: PeriodRange;
  preset: PeriodPreset;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function addDaysUtc(ts: number, days: number): number {
  return ts + days * DAY_MS;
}

function startOfUtcMonth(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

function startOfUtcYear(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), 0, 1);
}

function addMonthsUtc(ts: number, months: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate());
}

/** Constrói o período anterior com a mesma duração do período corrente. */
function previousOf(range: PeriodRange): PeriodRange {
  const duration = range.end - range.start;
  return { start: range.start - duration, end: range.start };
}

/**
 * Resolve um preset (ou intervalo custom) para um período absoluto com comparação anterior.
 *
 * @param preset preset desejado
 * @param now timestamp de referência (default: Date.now())
 * @param custom intervalo explícito quando preset === "custom" (start/end em ms; end exclusivo)
 */
export function resolvePeriod(
  preset: PeriodPreset,
  now: number = Date.now(),
  custom?: { start: number; end: number }
): ResolvedPeriod {
  const todayStart = startOfUtcDay(now);
  let range: PeriodRange;

  switch (preset) {
    case "today":
      range = { start: todayStart, end: addDaysUtc(todayStart, 1) };
      break;
    case "yesterday":
      range = { start: addDaysUtc(todayStart, -1), end: todayStart };
      break;
    case "last7":
      range = { start: addDaysUtc(todayStart, -6), end: addDaysUtc(todayStart, 1) };
      break;
    case "last30":
      range = { start: addDaysUtc(todayStart, -29), end: addDaysUtc(todayStart, 1) };
      break;
    case "last90":
      range = { start: addDaysUtc(todayStart, -89), end: addDaysUtc(todayStart, 1) };
      break;
    case "this_month": {
      const s = startOfUtcMonth(now);
      range = { start: s, end: addDaysUtc(todayStart, 1) };
      break;
    }
    case "last_month": {
      const thisMonth = startOfUtcMonth(now);
      range = { start: addMonthsUtc(thisMonth, -1), end: thisMonth };
      break;
    }
    case "this_year": {
      const s = startOfUtcYear(now);
      range = { start: s, end: addDaysUtc(todayStart, 1) };
      break;
    }
    case "custom": {
      if (!custom) {
        throw new Error("custom period requires an explicit start/end");
      }
      const start = startOfUtcDay(custom.start);
      // Fim exclusivo: dia seguinte ao último dia selecionado.
      const end = addDaysUtc(startOfUtcDay(custom.end), 1);
      range = { start, end };
      break;
    }
    default:
      range = { start: todayStart, end: addDaysUtc(todayStart, 1) };
  }

  return { ...range, previous: previousOf(range), preset };
}

/** Calcula crescimento percentual entre o valor atual e o anterior. */
export function growthPercent(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
}

/** Janelas fixas usadas nos cartões "hoje / semana / mês" independentemente do filtro. */
export function fixedWindows(now: number = Date.now()) {
  const todayStart = startOfUtcDay(now);
  return {
    today: { start: todayStart, end: addDaysUtc(todayStart, 1) },
    last7: { start: addDaysUtc(todayStart, -6), end: addDaysUtc(todayStart, 1) },
    last30: { start: addDaysUtc(todayStart, -29), end: addDaysUtc(todayStart, 1) },
  } as const;
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  last7: "Últimos 7 dias",
  last30: "Últimos 30 dias",
  last90: "Últimos 90 dias",
  this_month: "Este mês",
  last_month: "Mês anterior",
  this_year: "Este ano",
  custom: "Personalizado",
};
