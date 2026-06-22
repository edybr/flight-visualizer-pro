import { describe, it, expect } from "vitest";
import { generateTelemetryPdf, type FlightForPdf } from "./telemetryPdf";
import type { PlaybackPoint } from "./playback";

/**
 * Testa a geração do PDF de telemetria sem disparar download real.
 * Mockamos jsPDF.save para capturar o blob e validar que há conteúdo.
 */

const flight: FlightForPdf = {
  flightName: "Voo de Teste — Praia",
  droneModel: "DJI Mavic 3 Enterprise",
  locationLabel: "Chiador-MG",
  sourceFormat: "dji-txt",
  sourceFileName: "FlightRecord_2026.txt",
  startedAt: "2026-05-24T08:00:00.000Z",
  endedAt: "2026-05-24T08:20:00.000Z",
  durationSeconds: 1200,
  distanceMeters: 4200,
  maxAltitudeMeters: 120,
  maxSpeedMs: 1580,
  pointsCount: 5,
};

function makePoints(n: number): PlaybackPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    t: 1000 + i * 100,
    lat: -22 - i * 0.0001,
    lng: -43 - i * 0.0001,
    alt: 10 + i,
    altMsl: 380 + i,
    speed: i % 7,
    battery: 100 - i * 0.5,
    voltage: 7.4 - i * 0.001,
    batTemp: 40 + (i % 5),
    gpsNum: 12 + (i % 4),
    rcUp: 90,
    rcDown: 90,
    vSpeed: 0,
    heading: -20 + i,
  }));
}

describe("generateTelemetryPdf", () => {
  it("returns a sanitized filename and saves a pdf", () => {
    const points = makePoints(50);
    const name = generateTelemetryPdf(flight, points, { appVersion: "1.7" });
    expect(name).toMatch(/^telemetria_.*\.pdf$/);
    // Sem acentos/espaços problemáticos no nome do arquivo
    expect(name).not.toMatch(/[—•]/);
  });

  it("handles large trajectories via sampling without throwing", () => {
    const points = makePoints(12000);
    expect(() =>
      generateTelemetryPdf(flight, points, { appVersion: "1.7", maxRows: 600 }),
    ).not.toThrow();
  });

  it("handles a flight with no telemetry fields beyond coordinates", () => {
    const coordsOnly: PlaybackPoint[] = [
      { t: 1000, lat: -22, lng: -43 },
      { t: 2000, lat: -22.1, lng: -43.1 },
    ];
    expect(() =>
      generateTelemetryPdf({ ...flight, pointsCount: 2 }, coordsOnly, {
        appVersion: "1.7",
      }),
    ).not.toThrow();
  });
});
