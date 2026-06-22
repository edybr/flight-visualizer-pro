import { describe, expect, it } from "vitest";
import { resolvePeriod, growthPercent, fixedWindows } from "./period";

// "agora" fixo: 2026-06-22T15:30:00Z (segunda-feira)
const NOW = Date.UTC(2026, 5, 22, 15, 30, 0);
const DAY = 24 * 60 * 60 * 1000;

describe("resolvePeriod", () => {
  it("resolve 'today' como o dia UTC corrente", () => {
    const p = resolvePeriod("today", NOW);
    expect(p.start).toBe(Date.UTC(2026, 5, 22));
    expect(p.end).toBe(Date.UTC(2026, 5, 23));
    // período anterior = ontem
    expect(p.previous.start).toBe(Date.UTC(2026, 5, 21));
    expect(p.previous.end).toBe(Date.UTC(2026, 5, 22));
  });

  it("resolve 'yesterday'", () => {
    const p = resolvePeriod("yesterday", NOW);
    expect(p.start).toBe(Date.UTC(2026, 5, 21));
    expect(p.end).toBe(Date.UTC(2026, 5, 22));
  });

  it("resolve 'last7' incluindo hoje (7 dias)", () => {
    const p = resolvePeriod("last7", NOW);
    expect(p.end - p.start).toBe(7 * DAY);
    expect(p.start).toBe(Date.UTC(2026, 5, 16));
    expect(p.end).toBe(Date.UTC(2026, 5, 23));
  });

  it("resolve 'last30' com 30 dias de duração", () => {
    const p = resolvePeriod("last30", NOW);
    expect(p.end - p.start).toBe(30 * DAY);
  });

  it("resolve 'this_month' do dia 1 até amanhã", () => {
    const p = resolvePeriod("this_month", NOW);
    expect(p.start).toBe(Date.UTC(2026, 5, 1));
    expect(p.end).toBe(Date.UTC(2026, 5, 23));
  });

  it("resolve 'last_month' como o mês completo anterior", () => {
    const p = resolvePeriod("last_month", NOW);
    expect(p.start).toBe(Date.UTC(2026, 4, 1));
    expect(p.end).toBe(Date.UTC(2026, 5, 1));
  });

  it("resolve 'this_year' a partir de 1 de janeiro", () => {
    const p = resolvePeriod("this_year", NOW);
    expect(p.start).toBe(Date.UTC(2026, 0, 1));
  });

  it("resolve 'custom' tornando o fim exclusivo (dia seguinte)", () => {
    const start = Date.UTC(2026, 5, 10, 8, 0, 0);
    const end = Date.UTC(2026, 5, 12, 22, 0, 0);
    const p = resolvePeriod("custom", NOW, { start, end });
    expect(p.start).toBe(Date.UTC(2026, 5, 10));
    expect(p.end).toBe(Date.UTC(2026, 5, 13));
  });

  it("lança erro quando custom não recebe intervalo", () => {
    expect(() => resolvePeriod("custom", NOW)).toThrow();
  });

  it("período anterior tem a mesma duração do atual", () => {
    const p = resolvePeriod("last30", NOW);
    expect(p.end - p.start).toBe(p.previous.end - p.previous.start);
    expect(p.previous.end).toBe(p.start);
  });
});

describe("growthPercent", () => {
  it("calcula crescimento positivo", () => {
    expect(growthPercent(150, 100)).toBeCloseTo(50);
  });
  it("calcula queda", () => {
    expect(growthPercent(50, 100)).toBeCloseTo(-50);
  });
  it("retorna 0 quando ambos são zero", () => {
    expect(growthPercent(0, 0)).toBe(0);
  });
  it("retorna 100 quando o anterior é zero e há valor atual", () => {
    expect(growthPercent(10, 0)).toBe(100);
  });
});

describe("fixedWindows", () => {
  it("retorna janelas hoje/7d/30d coerentes", () => {
    const w = fixedWindows(NOW);
    expect(w.today.start).toBe(Date.UTC(2026, 5, 22));
    expect(w.last7.end - w.last7.start).toBe(7 * DAY);
    expect(w.last30.end - w.last30.start).toBe(30 * DAY);
  });
});
