import { z } from "zod";

/**
 * Strict SARPAS flight schema validator.
 * Any file deviating from this format must be rejected with a clear error.
 */

const pointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.array(z.number()).length(2),
});

const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.array(z.number()).length(2))).min(1),
});

const personSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  telephone: z.string().optional(),
  profile: z.string().optional(),
  CPF: z.string().optional(),
}).passthrough();

const requestedAreaItemSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  flight_id: z.number().optional(),
  origin_type: z.string().optional(),
  takeoff_point: pointSchema,
  landing_point: pointSchema,
  route_type: z.string(),
  route_coordinates: polygonSchema,
  vertical_type: z.string().optional(),
  vertical_distance: z.number().optional(),
  regional_id: z.number().optional(),
  regional_name: z.string().optional(),
}).passthrough();

export const sarpasFlightSchema = z.object({
  protocol: z.string().min(1, "protocol obrigatório"),
  status: z.string(),
  flight_type: z.string(),
  operation_type: z.string(),
  operation_name: z.string(),
  operation_start: z.string(),
  operation_finish: z.string(),
  interval: z.string(),
  created_at: z.string().optional(),
  asa_reason: z.string().optional(),
  analised_at: z.string().optional(),
  canceled: z.string().optional(),
  operation_responsible: personSchema.optional(),
  default_operator: personSchema.optional(),
  flight_pilots: z.array(z.object({ sarpas_code: z.string() }).passthrough()).optional(),
  aircrafts: z.array(z.object({
    type: z.string(),
    document_number: z.string(),
  }).passthrough()).optional(),
  requested_area: z.array(requestedAreaItemSchema).min(1, "requested_area precisa de pelo menos 1 item"),
}).passthrough();

export const sarpasFileSchema = z.array(sarpasFlightSchema).min(1, "Arquivo SARPAS vazio");

export type SarpasFlight = z.infer<typeof sarpasFlightSchema>;

export type ValidationResult =
  | { ok: true; data: SarpasFlight[] }
  | { ok: false; error: string; details?: string };

export function validateSarpasFile(raw: unknown): ValidationResult {
  // Must be an array at the root
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error: "Formato inválido: o arquivo SARPAS deve conter um array JSON de voos na raiz.",
    };
  }

  const parsed = sarpasFileSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 5).map((issue) => {
      const path = issue.path.join(".");
      return `• ${path || "(raiz)"}: ${issue.message}`;
    }).join("\n");
    return {
      ok: false,
      error: "Arquivo não está no formato SARPAS esperado.",
      details: issues,
    };
  }

  return { ok: true, data: parsed.data };
}
