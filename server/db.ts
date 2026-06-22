import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, flights, InsertFlight, Flight, notes, InsertNote, Note, actualFlights, InsertActualFlight, ActualFlight } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ---------- Flights ----------

export async function upsertFlight(flight: InsertFlight): Promise<Flight | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Upsert by (userId, protocol)
  await db
    .insert(flights)
    .values(flight)
    .onDuplicateKeyUpdate({
      set: {
        status: flight.status ?? null,
        flightType: flight.flightType ?? null,
        operationType: flight.operationType ?? null,
        operationName: flight.operationName ?? null,
        operationStart: flight.operationStart ?? null,
        operationFinish: flight.operationFinish ?? null,
        interval: flight.interval ?? null,
        asaReason: flight.asaReason ?? null,
        analisedAt: flight.analisedAt ?? null,
        canceled: flight.canceled ?? null,
        createdAtSarpas: flight.createdAtSarpas ?? null,
        operationResponsible: flight.operationResponsible ?? null,
        defaultOperator: flight.defaultOperator ?? null,
        flightPilots: flight.flightPilots ?? null,
        aircrafts: flight.aircrafts ?? null,
        requestedArea: flight.requestedArea ?? null,
      },
    });

  const result = await db
    .select()
    .from(flights)
    .where(and(eq(flights.userId, flight.userId!), eq(flights.protocol, flight.protocol!)))
    .limit(1);

  return result[0];
}

export type FlightFilters = {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  search?: string;    // by operation_name (location/name)
  status?: string;
};

export async function listFlights(userId: number, filters: FlightFilters = {}): Promise<Flight[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(flights.userId, userId)];

  if (filters.startDate) {
    conditions.push(gte(flights.operationStart, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(flights.operationStart, filters.endDate));
  }
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    // Use JSON_SEARCH to also match against regional_name inside requestedArea JSON column.
    conditions.push(
      or(
        like(flights.operationName, term),
        like(flights.protocol, term),
        sql`JSON_SEARCH(${flights.requestedArea}, 'one', ${term}, NULL, '$**.regional_name') IS NOT NULL`
      )!
    );
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(like(flights.status, `%${filters.status}%`));
  }

  return await db
    .select()
    .from(flights)
    .where(and(...conditions))
    .orderBy(desc(flights.operationStart), desc(flights.createdAt));
}

export async function getFlightById(id: number, userId: number): Promise<Flight | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(flights)
    .where(and(eq(flights.id, id), eq(flights.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function getFlightByShareToken(token: string): Promise<Flight | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(flights).where(eq(flights.shareToken, token)).limit(1);
  return rows[0];
}

export async function setFlightShareToken(id: number, userId: number, token: string | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(flights)
    .set({ shareToken: token })
    .where(and(eq(flights.id, id), eq(flights.userId, userId)));
}

export async function deleteFlight(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(flights).where(and(eq(flights.id, id), eq(flights.userId, userId)));
  await db.delete(notes).where(and(eq(notes.flightId, id), eq(notes.userId, userId)));
}

// ---------- Notes ----------

export async function listNotesByFlight(flightId: number): Promise<Note[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notes).where(eq(notes.flightId, flightId)).orderBy(desc(notes.createdAt));
}

export async function createNote(note: InsertNote): Promise<Note | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notes).values(note).$returningId();
  const id = (result as any)[0]?.id;
  if (!id) return undefined;
  const rows = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return rows[0];
}

export async function updateNote(id: number, userId: number, content: string): Promise<Note | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notes).set({ content }).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  const rows = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return rows[0];
}

export async function deleteNote(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}

// ---------- Actual Flights (voos realizados - logs DJI) ----------

export type ActualFlightFilters = {
  startDate?: string;
  endDate?: string;
  search?: string;
};

export async function createActualFlight(input: InsertActualFlight): Promise<ActualFlight | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(actualFlights).values(input).$returningId();
  const id = (result as any)[0]?.id;
  if (!id) return undefined;
  const rows = await db.select().from(actualFlights).where(eq(actualFlights.id, id)).limit(1);
  return rows[0];
}

export async function listActualFlights(
  userId: number,
  filters: ActualFlightFilters = {}
): Promise<ActualFlight[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(actualFlights.userId, userId)];

  if (filters.startDate) {
    conditions.push(gte(actualFlights.flightDate, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(actualFlights.flightDate, filters.endDate));
  }
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        like(actualFlights.flightName, term),
        like(actualFlights.droneModel, term),
        like(actualFlights.locationLabel, term)
      )!
    );
  }

  return await db
    .select()
    .from(actualFlights)
    .where(and(...conditions))
    .orderBy(desc(actualFlights.flightDate), desc(actualFlights.createdAt));
}

export async function getActualFlightById(
  id: number,
  userId: number
): Promise<ActualFlight | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(actualFlights)
    .where(and(eq(actualFlights.id, id), eq(actualFlights.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function getActualFlightByShareToken(
  token: string
): Promise<ActualFlight | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(actualFlights)
    .where(eq(actualFlights.shareToken, token))
    .limit(1);
  return rows[0];
}

export async function setActualFlightShareToken(
  id: number,
  userId: number,
  token: string | null
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(actualFlights)
    .set({ shareToken: token })
    .where(and(eq(actualFlights.id, id), eq(actualFlights.userId, userId)));
}

export async function updateActualFlight(
  id: number,
  userId: number,
  patch: Partial<InsertActualFlight>
): Promise<ActualFlight | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(actualFlights)
    .set(patch)
    .where(and(eq(actualFlights.id, id), eq(actualFlights.userId, userId)));
  return getActualFlightById(id, userId);
}

export async function deleteActualFlight(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(actualFlights)
    .where(and(eq(actualFlights.id, id), eq(actualFlights.userId, userId)));
}
