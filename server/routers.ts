import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createActualFlight,
  createNote,
  deleteActualFlight,
  deleteFlight,
  deleteNote,
  getActualFlightById,
  getActualFlightByShareToken,
  getFlightById,
  getFlightByShareToken,
  listActualFlights,
  listFlights,
  listNotesByFlight,
  setActualFlightShareToken,
  setFlightShareToken,
  updateActualFlight,
  updateNote,
  upsertFlight,
} from "./db";
import { parseActualFlightAsync } from "./djiLog";
import { validateSarpasFile } from "./sarpas";
import { adminRouter, leadCaptureRouter } from "./routers/admin";
import { recordActivity } from "./adminMetrics";

const filtersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
});

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  leads: leadCaptureRouter,

  auth: router({
    me: publicProcedure.query((opts) => {
      // Registra atividade do usuário autenticado (best-effort) para métricas DAU/WAU/MAU.
      if (opts.ctx.user) {
        void recordActivity({ userId: opts.ctx.user.id, type: "session" });
      }
      return opts.ctx.user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  flights: router({
    list: protectedProcedure.input(filtersSchema).query(async ({ ctx, input }) => {
      return await listFlights(ctx.user.id, input);
    }),

    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const flight = await getFlightById(input.id, ctx.user.id);
      if (!flight) throw new TRPCError({ code: "NOT_FOUND", message: "Voo não encontrado." });
      return flight;
    }),

    import: protectedProcedure
      .input(z.object({ content: z.string() }))
      .mutation(async ({ ctx, input }) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(input.content);
        } catch (e) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Arquivo inválido: JSON malformado. Envie um arquivo SARPAS válido.",
          });
        }

        const validation = validateSarpasFile(parsed);
        if (!validation.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.details ? `${validation.error}\n${validation.details}` : validation.error,
          });
        }

        void recordActivity({ userId: ctx.user.id, type: "import_flight" });
        let imported = 0;
        let updated = 0;

        for (const f of validation.data) {
          const existing = await upsertFlight({
            userId: ctx.user.id,
            protocol: f.protocol,
            status: f.status,
            flightType: f.flight_type,
            operationType: f.operation_type,
            operationName: f.operation_name,
            operationStart: f.operation_start,
            operationFinish: f.operation_finish,
            interval: f.interval,
            asaReason: f.asa_reason ?? null,
            analisedAt: f.analised_at ?? null,
            canceled: f.canceled ?? null,
            createdAtSarpas: f.created_at ?? null,
            operationResponsible: f.operation_responsible ?? null,
            defaultOperator: f.default_operator ?? null,
            flightPilots: f.flight_pilots ?? null,
            aircrafts: f.aircrafts ?? null,
            requestedArea: f.requested_area ?? null,
          });
          if (existing) imported += 1;
        }

        return {
          success: true,
          total: validation.data.length,
          imported,
          updated,
        };
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await deleteFlight(input.id, ctx.user.id);
      return { success: true };
    }),

    enableShare: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const flight = await getFlightById(input.id, ctx.user.id);
      if (!flight) throw new TRPCError({ code: "NOT_FOUND" });
      let token = flight.shareToken;
      if (!token) {
        token = nanoid(24);
        await setFlightShareToken(input.id, ctx.user.id, token);
      }
      return { token };
    }),

    disableShare: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await setFlightShareToken(input.id, ctx.user.id, null);
      return { success: true };
    }),

    // Public endpoint - no auth, used by shared links.
    getByShareToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const flight = await getFlightByShareToken(input.token);
        if (!flight) throw new TRPCError({ code: "NOT_FOUND", message: "Link inválido ou expirado." });
        // Strip sensitive PII from public response
        const sanitize = (p: any) => {
          if (!p) return p;
          const { CPF, telephone, email, ...rest } = p;
          return rest;
        };
        return {
          ...flight,
          operationResponsible: sanitize(flight.operationResponsible),
          defaultOperator: sanitize(flight.defaultOperator),
        };
      }),
  }),

  actualFlights: router({
    list: protectedProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          search: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const rows = await listActualFlights(ctx.user.id, input);
        // Para a lista, não devolvemos a trajetória inteira (pode ser grande).
        return rows.map((r) => {
          const { trajectory, ...rest } = r as any;
          return { ...rest, trajectoryPoints: Array.isArray(trajectory) ? trajectory.length : 0 };
        });
      }),

    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const row = await getActualFlightById(input.id, ctx.user.id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Voo realizado não encontrado." });
      return row;
    }),

    import: protectedProcedure
      .input(
        z.object({
          content: z.string().optional(),
          binaryBase64: z.string().optional(),
          fileName: z.string(),
          locationLabel: z.string().optional(),
          droneModel: z.string().optional(),
          relatedFlightId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await parseActualFlightAsync({
          content: input.content,
          binaryBase64: input.binaryBase64,
          fileName: input.fileName,
          apiKey: ENV.djiApiKey || undefined,
        });
        if (!result.ok) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        void recordActivity({ userId: ctx.user.id, type: "import_actual" });
        const data = result.data;
        const created = await createActualFlight({
          userId: ctx.user.id,
          flightName: data.flightName,
          droneModel: input.droneModel ?? data.droneModel ?? null,
          sourceFormat: data.sourceFormat,
          sourceFileName: input.fileName,
          startedAt: data.startedAt,
          endedAt: data.endedAt,
          flightDate: data.flightDate,
          durationSeconds: data.durationSeconds,
          distanceMeters: data.distanceMeters,
          maxAltitudeMeters: data.maxAltitudeMeters,
          maxSpeedMs: Math.round(data.maxSpeedMs * 100),
          pointsCount: data.pointsCount,
          locationLabel: input.locationLabel ?? null,
          trajectory: data.trajectory,
          relatedFlightId: input.relatedFlightId ?? null,
        });
        return { success: true, id: created?.id ?? null };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          flightName: z.string().min(1).max(255).optional(),
          locationLabel: z.string().max(255).optional().nullable(),
          droneModel: z.string().max(128).optional().nullable(),
          relatedFlightId: z.number().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...patch } = input;
        const cleaned: any = {};
        if (patch.flightName !== undefined) cleaned.flightName = patch.flightName;
        if (patch.locationLabel !== undefined) cleaned.locationLabel = patch.locationLabel;
        if (patch.droneModel !== undefined) cleaned.droneModel = patch.droneModel;
        if (patch.relatedFlightId !== undefined) cleaned.relatedFlightId = patch.relatedFlightId;
        return await updateActualFlight(id, ctx.user.id, cleaned);
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await deleteActualFlight(input.id, ctx.user.id);
      return { success: true };
    }),

    enableShare: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const row = await getActualFlightById(input.id, ctx.user.id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      let token = row.shareToken;
      if (!token) {
        token = nanoid(24);
        await setActualFlightShareToken(input.id, ctx.user.id, token);
      }
      return { token };
    }),

    disableShare: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await setActualFlightShareToken(input.id, ctx.user.id, null);
      return { success: true };
    }),

    getByShareToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const row = await getActualFlightByShareToken(input.token);
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Link inválido ou expirado." });
        return row;
      }),
  }),

  notes: router({
    listByFlight: protectedProcedure
      .input(z.object({ flightId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify ownership
        const flight = await getFlightById(input.flightId, ctx.user.id);
        if (!flight) throw new TRPCError({ code: "NOT_FOUND" });
        return await listNotesByFlight(input.flightId);
      }),

    create: protectedProcedure
      .input(z.object({ flightId: z.number(), content: z.string().min(1).max(5000) }))
      .mutation(async ({ ctx, input }) => {
        const flight = await getFlightById(input.flightId, ctx.user.id);
        if (!flight) throw new TRPCError({ code: "NOT_FOUND" });
        return await createNote({
          flightId: input.flightId,
          userId: ctx.user.id,
          content: input.content,
        });
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), content: z.string().min(1).max(5000) }))
      .mutation(async ({ ctx, input }) => {
        return await updateNote(input.id, ctx.user.id, input.content);
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await deleteNote(input.id, ctx.user.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
