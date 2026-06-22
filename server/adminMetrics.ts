import { and, gte, lt, sql, eq } from "drizzle-orm";
import {
  users,
  flights,
  actualFlights,
  leads,
  subscriptions,
  activityEvents,
  InsertLead,
  InsertActivityEvent,
} from "../drizzle/schema";
import {
  resolvePeriod,
  growthPercent,
  type PeriodPreset,
  type PeriodRange,
} from "@shared/period";
import { getDb } from "./db";

/** Conta linhas de uma tabela cujo `createdAt` cai dentro de [start, end). */
async function countInRange(
  table: any,
  column: any,
  range: PeriodRange,
  extra?: any
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const conds = [gte(column, new Date(range.start)), lt(column, new Date(range.end))];
  if (extra) conds.push(extra);
  const rows = await db
    .select({ c: sql<number>`count(*)` })
    .from(table)
    .where(and(...conds));
  return Number(rows[0]?.c ?? 0);
}

/** Conta usuários distintos com atividade dentro de [start, end). */
async function activeUsersInRange(range: PeriodRange): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ c: sql<number>`count(distinct ${activityEvents.userId})` })
    .from(activityEvents)
    .where(
      and(
        gte(activityEvents.createdAt, new Date(range.start)),
        lt(activityEvents.createdAt, new Date(range.end))
      )
    );
  return Number(rows[0]?.c ?? 0);
}

export interface MetricCard {
  value: number;
  previous: number;
  growthPercent: number;
}

function card(value: number, previous: number): MetricCard {
  return { value, previous, growthPercent: growthPercent(value, previous) };
}

/** Série temporal diária de contagens de uma coluna createdAt dentro do período. */
async function dailySeries(
  table: any,
  column: any,
  range: PeriodRange
): Promise<{ date: string; count: number }[]> {
  const db = await getDb();
  if (!db) return [];
  // Buscamos apenas os timestamps e agregamos por dia em JS. Isso evita incompatibilidades
  // com o sql_mode only_full_group_by e mantém o resultado portável entre engines.
  const rows = await db
    .select({ ts: column })
    .from(table)
    .where(and(gte(column, new Date(range.start)), lt(column, new Date(range.end))));
  const map = new Map<string, number>();
  for (const r of rows as { ts: Date | string | number }[]) {
    const d = new Date(r.ts as any);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate()
    ).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface DashboardMetrics {
  period: { preset: PeriodPreset; start: number; end: number };
  users: {
    total: number;
    activeToday: number;
    activeWeek: number;
    activeMonth: number;
    newInPeriod: MetricCard;
    series: { date: string; count: number }[];
  };
  flights: {
    totalImported: number;
    importedInPeriod: MetricCard;
    totalFlightHours: number;
    totalDistanceKm: number;
    avgFlightsPerUser: number;
    series: { date: string; count: number }[];
  };
  leads: {
    totalInPeriod: MetricCard;
    converted: number;
    conversionRate: number;
    bySource: { source: string; count: number }[];
    series: { date: string; count: number }[];
  };
  revenue: {
    mrrCents: number;
    revenueInPeriodCents: number;
    revenueMonthCents: number;
    revenueYearCents: number;
    avgTicketCents: number;
    ltvCents: number;
    churnRate: number;
    activeSubscriptions: number;
  };
}

/**
 * Calcula todas as métricas do dashboard administrativo para um período.
 */
export async function getDashboardMetrics(
  preset: PeriodPreset,
  now: number = Date.now(),
  custom?: { start: number; end: number }
): Promise<DashboardMetrics> {
  const db = await getDb();
  const period = resolvePeriod(preset, now, custom);

  // Janelas fixas para os cartões "hoje / semana / mês" de atividade.
  const todayStart = Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate()
  );
  const DAY = 86400000;
  const wToday: PeriodRange = { start: todayStart, end: todayStart + DAY };
  const wWeek: PeriodRange = { start: todayStart - 6 * DAY, end: todayStart + DAY };
  const wMonth: PeriodRange = { start: todayStart - 29 * DAY, end: todayStart + DAY };

  const empty: DashboardMetrics = {
    period: { preset, start: period.start, end: period.end },
    users: {
      total: 0,
      activeToday: 0,
      activeWeek: 0,
      activeMonth: 0,
      newInPeriod: card(0, 0),
      series: [],
    },
    flights: {
      totalImported: 0,
      importedInPeriod: card(0, 0),
      totalFlightHours: 0,
      totalDistanceKm: 0,
      avgFlightsPerUser: 0,
      series: [],
    },
    leads: {
      totalInPeriod: card(0, 0),
      converted: 0,
      conversionRate: 0,
      bySource: [],
      series: [],
    },
    revenue: {
      mrrCents: 0,
      revenueInPeriodCents: 0,
      revenueMonthCents: 0,
      revenueYearCents: 0,
      avgTicketCents: 0,
      ltvCents: 0,
      churnRate: 0,
      activeSubscriptions: 0,
    },
  };

  if (!db) return empty;

  // ---------- Usuários ----------
  const totalUsersRow = await db.select({ c: sql<number>`count(*)` }).from(users);
  const totalUsers = Number(totalUsersRow[0]?.c ?? 0);

  const [activeToday, activeWeek, activeMonth] = await Promise.all([
    activeUsersInRange(wToday),
    activeUsersInRange(wWeek),
    activeUsersInRange(wMonth),
  ]);

  const newUsers = await countInRange(users, users.createdAt, period);
  const newUsersPrev = await countInRange(users, users.createdAt, period.previous);
  const usersSeries = await dailySeries(users, users.createdAt, period);

  // ---------- Voos (autorizados + realizados) ----------
  const totalFlightsRow = await db.select({ c: sql<number>`count(*)` }).from(flights);
  const totalActualRow = await db.select({ c: sql<number>`count(*)` }).from(actualFlights);
  const totalImported = Number(totalFlightsRow[0]?.c ?? 0) + Number(totalActualRow[0]?.c ?? 0);

  const importedNow =
    (await countInRange(flights, flights.createdAt, period)) +
    (await countInRange(actualFlights, actualFlights.createdAt, period));
  const importedPrev =
    (await countInRange(flights, flights.createdAt, period.previous)) +
    (await countInRange(actualFlights, actualFlights.createdAt, period.previous));

  // Horas de voo e distância vêm dos voos realizados (têm telemetria).
  const aggRow = await db
    .select({
      seconds: sql<number>`coalesce(sum(${actualFlights.durationSeconds}),0)`,
      meters: sql<number>`coalesce(sum(${actualFlights.distanceMeters}),0)`,
    })
    .from(actualFlights);
  const totalFlightHours = Number(aggRow[0]?.seconds ?? 0) / 3600;
  const totalDistanceKm = Number(aggRow[0]?.meters ?? 0) / 1000;
  const avgFlightsPerUser = totalUsers > 0 ? totalImported / totalUsers : 0;

  const flightsSeriesAuth = await dailySeries(flights, flights.createdAt, period);
  const flightsSeriesActual = await dailySeries(actualFlights, actualFlights.createdAt, period);
  // Combina as duas séries por data.
  const fMap = new Map<string, number>();
  for (const r of [...flightsSeriesAuth, ...flightsSeriesActual]) {
    fMap.set(r.date, (fMap.get(r.date) ?? 0) + r.count);
  }
  const flightsSeries = Array.from(fMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ---------- Leads ----------
  const leadsNow = await countInRange(leads, leads.createdAt, period);
  const leadsPrev = await countInRange(leads, leads.createdAt, period.previous);
  const convertedRow = await db
    .select({ c: sql<number>`count(*)` })
    .from(leads)
    .where(
      and(
        eq(leads.status, "converted"),
        gte(leads.createdAt, new Date(period.start)),
        lt(leads.createdAt, new Date(period.end))
      )
    );
  const converted = Number(convertedRow[0]?.c ?? 0);
  const conversionRate = leadsNow > 0 ? (converted / leadsNow) * 100 : 0;

  const sourceRows = await db
    .select({ source: leads.source })
    .from(leads)
    .where(and(gte(leads.createdAt, new Date(period.start)), lt(leads.createdAt, new Date(period.end))));
  const sourceMap = new Map<string, number>();
  for (const r of sourceRows as { source: string | null }[]) {
    const key = r.source ?? "desconhecido";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }
  const bySource = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count }));
  const leadsSeries = await dailySeries(leads, leads.createdAt, period);

  // ---------- Receita (estrutura) ----------
  const activeSubsRows = await db
    .select({
      count: sql<number>`count(*)`,
      sum: sql<number>`coalesce(sum(${subscriptions.amountCents}),0)`,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));
  const activeSubscriptions = Number(activeSubsRows[0]?.count ?? 0);
  // MRR: normaliza assinaturas anuais para mensal.
  const mrrRows = await db
    .select({
      monthly: sql<number>`coalesce(sum(case when ${subscriptions.interval} = 'year' then ${subscriptions.amountCents}/12 else ${subscriptions.amountCents} end),0)`,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));
  const mrrCents = Math.round(Number(mrrRows[0]?.monthly ?? 0));

  const revInPeriod = await db
    .select({ s: sql<number>`coalesce(sum(${subscriptions.amountCents}),0)` })
    .from(subscriptions)
    .where(and(gte(subscriptions.startedAt, new Date(period.start)), lt(subscriptions.startedAt, new Date(period.end))));
  const revenueInPeriodCents = Number(revInPeriod[0]?.s ?? 0);

  const revMonth = await db
    .select({ s: sql<number>`coalesce(sum(${subscriptions.amountCents}),0)` })
    .from(subscriptions)
    .where(and(gte(subscriptions.startedAt, new Date(wMonth.start)), lt(subscriptions.startedAt, new Date(wMonth.end))));
  const revenueMonthCents = Number(revMonth[0]?.s ?? 0);

  const yearStart = Date.UTC(new Date(now).getUTCFullYear(), 0, 1);
  const revYear = await db
    .select({ s: sql<number>`coalesce(sum(${subscriptions.amountCents}),0)` })
    .from(subscriptions)
    .where(gte(subscriptions.startedAt, new Date(yearStart)));
  const revenueYearCents = Number(revYear[0]?.s ?? 0);

  const avgTicketCents = activeSubscriptions > 0 ? Math.round(mrrCents / activeSubscriptions) : 0;
  // LTV simplificado: ticket médio / churn (quando houver churn); placeholder seguro.
  const canceledRows = await db
    .select({ c: sql<number>`count(*)` })
    .from(subscriptions)
    .where(eq(subscriptions.status, "canceled"));
  const canceled = Number(canceledRows[0]?.c ?? 0);
  const totalSubsRow = await db.select({ c: sql<number>`count(*)` }).from(subscriptions);
  const totalSubs = Number(totalSubsRow[0]?.c ?? 0);
  const churnRate = totalSubs > 0 ? (canceled / totalSubs) * 100 : 0;
  const ltvCents = churnRate > 0 ? Math.round(avgTicketCents / (churnRate / 100)) : 0;

  return {
    period: { preset, start: period.start, end: period.end },
    users: {
      total: totalUsers,
      activeToday,
      activeWeek,
      activeMonth,
      newInPeriod: card(newUsers, newUsersPrev),
      series: usersSeries,
    },
    flights: {
      totalImported,
      importedInPeriod: card(importedNow, importedPrev),
      totalFlightHours: Math.round(totalFlightHours * 10) / 10,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      avgFlightsPerUser: Math.round(avgFlightsPerUser * 10) / 10,
      series: flightsSeries,
    },
    leads: {
      totalInPeriod: card(leadsNow, leadsPrev),
      converted,
      conversionRate: Math.round(conversionRate * 10) / 10,
      bySource,
      series: leadsSeries,
    },
    revenue: {
      mrrCents,
      revenueInPeriodCents,
      revenueMonthCents,
      revenueYearCents,
      avgTicketCents,
      ltvCents,
      churnRate: Math.round(churnRate * 10) / 10,
      activeSubscriptions,
    },
  };
}

// ---------- Leads e atividade (helpers de escrita) ----------

export async function createLead(input: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leads).values(input).$returningId();
  const id = (result as any)[0]?.id;
  if (!id) return undefined;
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0];
}

export async function listLeads(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(leads).orderBy(sql`${leads.createdAt} desc`).limit(limit);
}

export async function recordActivity(input: InsertActivityEvent) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(activityEvents).values(input);
  } catch (e) {
    // Atividade é best-effort; nunca deve quebrar o fluxo principal.
    console.warn("[activity] failed to record:", e);
  }
}

// ---------- Listagens administrativas ----------

import { plans, actualFlights as actualTable } from "../drizzle/schema";
import { desc } from "drizzle-orm";

export async function listUsersAdmin(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      loginMethod: users.loginMethod,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit);
  return rows;
}

export async function adminUserCounts() {
  const db = await getDb();
  if (!db) return { total: 0, admins: 0 };
  const totalRow = await db.select({ c: sql<number>`count(*)` }).from(users);
  const adminRow = await db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, "admin"));
  return {
    total: Number(totalRow[0]?.c ?? 0),
    admins: Number(adminRow[0]?.c ?? 0),
  };
}

export async function listRecentFlightsAdmin(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  // Voos realizados recentes (têm telemetria, métricas mais ricas).
  const rows = await db
    .select({
      id: actualTable.id,
      userId: actualTable.userId,
      flightName: actualTable.flightName,
      droneModel: actualTable.droneModel,
      flightDate: actualTable.flightDate,
      durationSeconds: actualTable.durationSeconds,
      distanceMeters: actualTable.distanceMeters,
      createdAt: actualTable.createdAt,
    })
    .from(actualTable)
    .orderBy(desc(actualTable.createdAt))
    .limit(limit);
  return rows;
}

export async function listPlansAdmin() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(plans).orderBy(plans.sortOrder);
}

export async function updateLeadStatus(
  id: number,
  status: "new" | "contacted" | "qualified" | "converted" | "lost"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const patch: any = { status };
  if (status === "converted") patch.convertedAt = new Date();
  await db.update(leads).set(patch).where(eq(leads.id, id));
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0];
}
