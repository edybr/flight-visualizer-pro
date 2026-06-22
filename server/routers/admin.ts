import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getDashboardMetrics,
  listLeads,
  createLead,
  listUsersAdmin,
  adminUserCounts,
  listRecentFlightsAdmin,
  listPlansAdmin,
  updateLeadStatus,
} from "../adminMetrics";

const presetEnum = z.enum([
  "today",
  "yesterday",
  "last7",
  "last30",
  "last90",
  "this_month",
  "last_month",
  "this_year",
  "custom",
]);

export const adminRouter = router({
  /** Métricas completas do dashboard, filtradas por período. */
  dashboard: adminProcedure
    .input(
      z.object({
        preset: presetEnum.default("last30"),
        customStart: z.number().optional(),
        customEnd: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const custom =
        input.preset === "custom" && input.customStart && input.customEnd
          ? { start: input.customStart, end: input.customEnd }
          : undefined;
      return await getDashboardMetrics(input.preset, Date.now(), custom);
    }),

  /** Lista os leads mais recentes (somente admin). */
  leads: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
    .query(async ({ input }) => {
      return await listLeads(input?.limit ?? 100);
    }),

  /** Atualiza o status de um lead (funil de CRM). */
  updateLeadStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "qualified", "converted", "lost"]),
      })
    )
    .mutation(async ({ input }) => {
      return await updateLeadStatus(input.id, input.status);
    }),

  /** Lista usuários cadastrados (somente admin). */
  users: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
    .query(async ({ input }) => {
      const [list, counts] = await Promise.all([
        listUsersAdmin(input?.limit ?? 200),
        adminUserCounts(),
      ]);
      return { list, counts };
    }),

  /** Lista voos recentes da plataforma (somente admin). */
  recentFlights: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
    .query(async ({ input }) => {
      return await listRecentFlightsAdmin(input?.limit ?? 50);
    }),

  /** Lista planos cadastrados. */
  plans: adminProcedure.query(async () => {
    return await listPlansAdmin();
  }),
});

/**
 * Captura pública de leads (formulário de interesse). Não exige autenticação para
 * permitir captação a partir de páginas públicas / landing.
 */
export const leadCaptureRouter = router({
  /** Lista pública dos planos ativos (para a página de preços). */
  listPlans: publicProcedure.query(async () => {
    const all = await listPlansAdmin();
    return all.filter((p) => p.isActive);
  }),
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        company: z.string().max(255).optional(),
        segment: z.string().max(64).optional(),
        message: z.string().max(2000).optional(),
        source: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createLead({
        name: input.name,
        email: input.email,
        company: input.company ?? null,
        segment: input.segment ?? null,
        message: input.message ?? null,
        source: input.source ?? "site",
      });
      return { success: true } as const;
    }),
});
