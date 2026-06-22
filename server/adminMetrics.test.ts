import { describe, expect, it } from "vitest";
import { getDashboardMetrics } from "./adminMetrics";

/**
 * Estes testes validam o CONTRATO (shape) e a coerência de tipos de getDashboardMetrics,
 * de forma robusta tanto com banco disponível quanto sem. Não dependemos da contagem real
 * de linhas (que varia conforme o ambiente), apenas garantimos a estrutura estável que o
 * frontend consome e que nenhuma exceção é lançada.
 */
describe("getDashboardMetrics (contrato)", () => {
  it("retorna a estrutura completa e tipada", async () => {
    const m = await getDashboardMetrics("last30", Date.UTC(2026, 5, 22));

    expect(m.period.preset).toBe("last30");
    expect(typeof m.period.start).toBe("number");
    expect(typeof m.period.end).toBe("number");
    expect(m.period.end).toBeGreaterThanOrEqual(m.period.start);

    // Usuários
    for (const k of ["total", "activeToday", "activeWeek", "activeMonth"] as const) {
      expect(typeof m.users[k]).toBe("number");
      expect(m.users[k]).toBeGreaterThanOrEqual(0);
    }
    expect(m.users.newInPeriod).toHaveProperty("value");
    expect(m.users.newInPeriod).toHaveProperty("previous");
    expect(m.users.newInPeriod).toHaveProperty("growthPercent");
    expect(Array.isArray(m.users.series)).toBe(true);

    // Voos
    for (const k of [
      "totalImported",
      "totalFlightHours",
      "totalDistanceKm",
      "avgFlightsPerUser",
    ] as const) {
      expect(typeof m.flights[k]).toBe("number");
      expect(m.flights[k]).toBeGreaterThanOrEqual(0);
    }

    // Leads
    expect(typeof m.leads.converted).toBe("number");
    expect(typeof m.leads.conversionRate).toBe("number");
    expect(Array.isArray(m.leads.bySource)).toBe(true);

    // Receita (estrutura)
    for (const k of [
      "mrrCents",
      "avgTicketCents",
      "churnRate",
      "activeSubscriptions",
    ] as const) {
      expect(typeof m.revenue[k]).toBe("number");
      expect(m.revenue[k]).toBeGreaterThanOrEqual(0);
    }
  });

  it("aceita o preset 'today' e mantém o shape", async () => {
    const m = await getDashboardMetrics("today");
    expect(m.period.preset).toBe("today");
    expect(typeof m.users.total).toBe("number");
    expect(m.users.total).toBeGreaterThanOrEqual(0);
  });

  it("aceita período personalizado (custom) com início e fim explícitos", async () => {
    const start = Date.UTC(2026, 0, 1);
    const end = Date.UTC(2026, 0, 31);
    const now = Date.UTC(2026, 1, 15);
    const m = await getDashboardMetrics("custom", now, { start, end });
    expect(m.period.preset).toBe("custom");
    // O início é normalizado para o começo do dia UTC e o fim é exclusivo (+1 dia).
    expect(m.period.start).toBe(start);
    expect(m.period.end).toBeGreaterThan(end);
    expect(m.period.end).toBeGreaterThan(m.period.start);
  });
});
