import { describe, it, expect } from "vitest";
import {
  computeFieldStat,
  presentFields,
  sampleTrajectory,
  formatFieldValue,
  elapsedClock,
} from "./telemetry";
import type { PlaybackPoint } from "./playback";

const points: PlaybackPoint[] = [
  { t: 1000, lat: -22.0, lng: -43.0, alt: 10, speed: 1, battery: 100, batTemp: 40, gpsNum: 12 },
  { t: 2000, lat: -22.1, lng: -43.1, alt: 30, speed: 5, battery: 80, batTemp: 44, gpsNum: 15 },
  { t: 3000, lat: -22.2, lng: -43.2, alt: 20, speed: 3, battery: 60, batTemp: 42, gpsNum: 14 },
];

describe("computeFieldStat", () => {
  it("computes min, max and average over all points", () => {
    const stat = computeFieldStat(points, "alt");
    expect(stat).not.toBeNull();
    expect(stat!.min).toBe(10);
    expect(stat!.max).toBe(30);
    expect(stat!.avg).toBeCloseTo(20, 5);
    expect(stat!.count).toBe(3);
  });

  it("ignores non-finite/missing values", () => {
    const mixed: PlaybackPoint[] = [
      { lat: 0, lng: 0, voltage: 7.4 },
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0, voltage: 7.2 },
    ];
    const stat = computeFieldStat(mixed, "voltage");
    expect(stat!.count).toBe(2);
    expect(stat!.min).toBeCloseTo(7.2, 5);
    expect(stat!.max).toBeCloseTo(7.4, 5);
  });

  it("returns null when the field is absent", () => {
    expect(computeFieldStat(points, "voltage")).toBeNull();
  });
});

describe("presentFields", () => {
  it("only lists fields with at least one numeric sample, in stable order", () => {
    const fields = presentFields(points);
    expect(fields).toContain("alt");
    expect(fields).toContain("speed");
    expect(fields).toContain("battery");
    expect(fields).toContain("batTemp");
    expect(fields).toContain("gpsNum");
    expect(fields).not.toContain("voltage");
    // alt deve aparecer antes de speed (ordem estável definida)
    expect(fields.indexOf("alt")).toBeLessThan(fields.indexOf("speed"));
  });
});

describe("sampleTrajectory", () => {
  it("returns all points when total <= maxRows", () => {
    expect(sampleTrajectory(points, 10)).toHaveLength(3);
    expect(sampleTrajectory(points, 0)).toHaveLength(3);
  });

  it("samples down to roughly maxRows keeping first and last", () => {
    const big = Array.from({ length: 1000 }, (_, i) => ({ idx: i }));
    const sampled = sampleTrajectory(big, 100);
    expect(sampled.length).toBeLessThanOrEqual(101);
    expect(sampled.length).toBeGreaterThan(50);
    expect(sampled[0]).toEqual({ idx: 0 });
    expect(sampled[sampled.length - 1]).toEqual({ idx: 999 });
  });

  it("handles empty input", () => {
    expect(sampleTrajectory([], 100)).toEqual([]);
  });
});

describe("formatFieldValue", () => {
  it("formats with field-specific decimals", () => {
    expect(formatFieldValue("battery", 65)).toBe("65");
    expect(formatFieldValue("voltage", 7.413)).toBe("7.41");
    expect(formatFieldValue("alt", 23.55)).toBe("23.6");
  });

  it("returns dash for invalid values", () => {
    expect(formatFieldValue("alt", undefined)).toBe("—");
    expect(formatFieldValue("alt", NaN)).toBe("—");
  });
});

describe("elapsedClock", () => {
  it("formats elapsed time as mm:ss relative to t0", () => {
    expect(elapsedClock(1000, 1000)).toBe("00:00");
    expect(elapsedClock(91000, 1000)).toBe("01:30");
  });

  it("returns dash when timestamps are missing", () => {
    expect(elapsedClock(undefined, 1000)).toBe("—");
    expect(elapsedClock(1000, undefined)).toBe("—");
  });
});
