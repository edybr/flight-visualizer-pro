import { describe, expect, it } from "vitest";
import { validateSarpasFile } from "./sarpas";

const validFlight = {
  protocol: "ABC123",
  status: "Analise Automática - Aprovado",
  flight_type: "VLOS",
  operation_type: "Recreativo",
  operation_name: "Test Op",
  operation_start: "2026-05-10",
  operation_finish: "2026-05-10",
  interval: "14:00 às 19:00",
  asa_reason: "Aprovado",
  requested_area: [
    {
      id: 1,
      uuid: "u-1",
      takeoff_point: { type: "Point", coordinates: [-43.26, -21.77] },
      landing_point: { type: "Point", coordinates: [-43.26, -21.77] },
      route_type: "geojson",
      route_coordinates: {
        type: "Polygon",
        coordinates: [
          [
            [-43.26, -21.77],
            [-43.26, -21.78],
            [-43.27, -21.78],
            [-43.26, -21.77],
          ],
        ],
      },
    },
  ],
};

describe("validateSarpasFile", () => {
  it("accepts a valid SARPAS file (array with at least one valid flight)", () => {
    const result = validateSarpasFile([validFlight]);
    expect(result.ok).toBe(true);
  });

  it("rejects a non-array payload", () => {
    const result = validateSarpasFile({ foo: "bar" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/array/i);
    }
  });

  it("rejects an empty array", () => {
    const result = validateSarpasFile([]);
    expect(result.ok).toBe(false);
  });

  it("rejects a flight missing required fields", () => {
    const broken = { ...validFlight } as any;
    delete broken.protocol;
    const result = validateSarpasFile([broken]);
    expect(result.ok).toBe(false);
  });

  it("rejects a flight with malformed polygon coordinates", () => {
    const broken = {
      ...validFlight,
      requested_area: [
        {
          ...validFlight.requested_area[0],
          route_coordinates: { type: "Polygon", coordinates: [[[1]]] }, // invalid
        },
      ],
    };
    const result = validateSarpasFile([broken]);
    expect(result.ok).toBe(false);
  });

  it("rejects when requested_area is empty", () => {
    const result = validateSarpasFile([{ ...validFlight, requested_area: [] }]);
    expect(result.ok).toBe(false);
  });
});
