import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, index, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Flights table - stores SARPAS flight records imported by users.
 * Idempotent by (userId, protocol).
 */
export const flights = mysqlTable(
  "flights",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    protocol: varchar("protocol", { length: 64 }).notNull(),
    status: varchar("status", { length: 128 }),
    flightType: varchar("flightType", { length: 32 }),
    operationType: varchar("operationType", { length: 64 }),
    operationName: varchar("operationName", { length: 255 }),
    operationStart: varchar("operationStart", { length: 32 }),
    operationFinish: varchar("operationFinish", { length: 32 }),
    interval: varchar("interval", { length: 64 }),
    asaReason: text("asaReason"),
    analisedAt: varchar("analisedAt", { length: 32 }),
    canceled: varchar("canceled", { length: 32 }),
    createdAtSarpas: varchar("createdAtSarpas", { length: 32 }),
    // JSON blobs preserving the original structure (responsible, operator, pilots, aircrafts, requested_area)
    operationResponsible: json("operationResponsible"),
    defaultOperator: json("defaultOperator"),
    flightPilots: json("flightPilots"),
    aircrafts: json("aircrafts"),
    requestedArea: json("requestedArea"),
    // Public share token (nullable). When set, anyone with the token can view this flight.
    shareToken: varchar("shareToken", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userProtocolIdx: uniqueIndex("user_protocol_idx").on(table.userId, table.protocol),
    shareTokenIdx: uniqueIndex("share_token_idx").on(table.shareToken),
    userIdx: index("user_idx").on(table.userId),
    startIdx: index("start_idx").on(table.operationStart),
  })
);

export type Flight = typeof flights.$inferSelect;
export type InsertFlight = typeof flights.$inferInsert;

/**
 * Notes attached to a flight by its owner.
 */
export const notes = mysqlTable(
  "notes",
  {
    id: int("id").autoincrement().primaryKey(),
    flightId: int("flightId").notNull(),
    userId: int("userId").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    flightIdx: index("flight_idx").on(table.flightId),
  })
);

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

/**
 * Actual flights - voos realizados, importados a partir de logs DJI decodificados
 * (CSV do Phantom Help / Airdata, ou KML do DJI Flight Reader).
 *
 * `trajectory` é um array JSON de pontos { t, lat, lng, alt, speed? } ordenados
 * cronologicamente. Estatísticas pré-calculadas evitam recomputar a cada acesso.
 */
export const actualFlights = mysqlTable(
  "actual_flights",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    flightName: varchar("flightName", { length: 255 }).notNull(),
    droneModel: varchar("droneModel", { length: 128 }),
    sourceFormat: varchar("sourceFormat", { length: 16 }).notNull(), // "csv" | "kml"
    sourceFileName: varchar("sourceFileName", { length: 255 }),
    startedAt: varchar("startedAt", { length: 32 }), // ISO datetime
    endedAt: varchar("endedAt", { length: 32 }),
    flightDate: varchar("flightDate", { length: 16 }), // YYYY-MM-DD para filtros
    durationSeconds: int("durationSeconds"),
    distanceMeters: int("distanceMeters"),
    maxAltitudeMeters: int("maxAltitudeMeters"),
    maxSpeedMs: int("maxSpeedMs"), // m/s * 100 (centíduplos) — evita float
    pointsCount: int("pointsCount"),
    locationLabel: varchar("locationLabel", { length: 255 }),
    // Trajetória completa como JSON array
    trajectory: json("trajectory"),
    // Associação opcional a um voo SARPAS
    relatedFlightId: int("relatedFlightId"),
    shareToken: varchar("shareToken", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: index("actual_user_idx").on(table.userId),
    dateIdx: index("actual_date_idx").on(table.flightDate),
    shareTokenIdx: uniqueIndex("actual_share_token_idx").on(table.shareToken),
  })
);

export type ActualFlight = typeof actualFlights.$inferSelect;
export type InsertActualFlight = typeof actualFlights.$inferInsert;

/**
 * Leads - cadastros de interesse capturados (formulário, landing, etc.) para o funil de
 * conversão SaaS. `status` evolui de "new" até "converted". `convertedAt` marca a conversão.
 */
export const leads = mysqlTable(
  "leads",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 320 }),
    company: varchar("company", { length: 255 }),
    segment: varchar("segment", { length: 64 }), // inspeção, mapeamento, agro, audiovisual, perícia...
    source: varchar("source", { length: 64 }).default("site").notNull(), // origem do lead
    status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "lost"]) 
      .default("new")
      .notNull(),
    message: text("message"),
    convertedUserId: int("convertedUserId"), // usuário criado a partir do lead, se houver
    convertedAt: timestamp("convertedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    statusIdx: index("lead_status_idx").on(table.status),
    sourceIdx: index("lead_source_idx").on(table.source),
    createdIdx: index("lead_created_idx").on(table.createdAt),
  })
);

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Plans - catálogo de planos (gratuitos e pagos). Estrutura preparada para cobrança futura.
 * `priceCents` em centavos para evitar float; `interval` define a recorrência.
 */
export const plans = mysqlTable(
  "plans",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    priceCents: int("priceCents").default(0).notNull(),
    currency: varchar("currency", { length: 8 }).default("BRL").notNull(),
    interval: mysqlEnum("interval", ["month", "year", "lifetime", "free"]) 
      .default("free")
      .notNull(),
    maxFlights: int("maxFlights"), // null = ilimitado
    features: json("features"), // lista de features do plano
    isActive: int("isActive").default(1).notNull(), // 1 = ativo, 0 = inativo
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

/**
 * Subscriptions - assinatura de um usuário a um plano. Estrutura para MRR/receita.
 * `amountCents` registra o valor pago no ciclo (snapshot, independente de mudanças no plano).
 */
export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    planId: int("planId").notNull(),
    status: mysqlEnum("status", ["active", "trialing", "past_due", "canceled", "expired"]) 
      .default("active")
      .notNull(),
    amountCents: int("amountCents").default(0).notNull(),
    currency: varchar("currency", { length: 8 }).default("BRL").notNull(),
    interval: mysqlEnum("interval", ["month", "year", "lifetime", "free"]) 
      .default("free")
      .notNull(),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    currentPeriodEnd: timestamp("currentPeriodEnd"),
    canceledAt: timestamp("canceledAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: index("sub_user_idx").on(table.userId),
    statusIdx: index("sub_status_idx").on(table.status),
  })
);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Activity events - registro leve de atividade do usuário para métricas DAU/WAU/MAU.
 * Um evento por interação relevante (login, importação, etc.).
 */
export const activityEvents = mysqlTable(
  "activity_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    type: varchar("type", { length: 64 }).notNull(), // login, import_flight, import_actual, export_pdf...
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("activity_user_idx").on(table.userId),
    createdIdx: index("activity_created_idx").on(table.createdAt),
    typeIdx: index("activity_type_idx").on(table.type),
  })
);

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type InsertActivityEvent = typeof activityEvents.$inferInsert;
