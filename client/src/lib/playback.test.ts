import { describe, expect, it } from "vitest";
import {
  formatClock,
  elapsedAtIndex,
  totalDuration,
  validTrajectory,
  type PlaybackPoint,
} from "./playback";

describe("formatClock", () => {
  it("formata milissegundos como mm:ss", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(5000)).toBe("00:05");
    expect(formatClock(65000)).toBe("01:05");
    expect(formatClock(600000)).toBe("10:00");
  });

  it("nunca retorna valores negativos", () => {
    expect(formatClock(-1000)).toBe("00:00");
  });
});

describe("elapsedAtIndex", () => {
  const withTimestamps: PlaybackPoint[] = [
    { t: 1000, lat: -21.5, lng: -43.2 },
    { t: 3000, lat: -21.6, lng: -43.3 },
    { t: 6000, lat: -21.7, lng: -43.4 },
  ];

  it("usa timestamps reais quando disponíveis", () => {
    expect(elapsedAtIndex(withTimestamps, 0)).toBe(0);
    expect(elapsedAtIndex(withTimestamps, 1)).toBe(2000);
    expect(elapsedAtIndex(withTimestamps, 2)).toBe(5000);
  });

  it("limita o índice ao intervalo válido", () => {
    expect(elapsedAtIndex(withTimestamps, 99)).toBe(5000);
    expect(elapsedAtIndex(withTimestamps, -5)).toBe(0);
  });

  it("retorna 0 para trajetória vazia", () => {
    expect(elapsedAtIndex([], 0)).toBe(0);
  });

  it("estima tempo quando não há timestamps", () => {
    const noTs: PlaybackPoint[] = Array.from({ length: 20 }, (_, i) => ({
      lat: -21 - i * 0.001,
      lng: -43,
    }));
    // 20 pontos, ~10 amostras/seg => ~2s total; no índice final ~2000ms
    expect(elapsedAtIndex(noTs, 19)).toBeCloseTo(2000, 0);
  });
});

describe("totalDuration", () => {
  it("calcula a duração total com timestamps", () => {
    const pts: PlaybackPoint[] = [
      { t: 1000, lat: 0, lng: 0 },
      { t: 11000, lat: 1, lng: 1 },
    ];
    expect(totalDuration(pts)).toBe(10000);
  });

  it("retorna 0 quando há menos de 2 pontos", () => {
    expect(totalDuration([{ t: 1000, lat: 0, lng: 0 }])).toBe(0);
    expect(totalDuration([])).toBe(0);
  });
});

describe("validTrajectory", () => {
  it("remove pontos com coordenadas inválidas", () => {
    const pts: PlaybackPoint[] = [
      { lat: -21.5, lng: -43.2 },
      { lat: NaN, lng: -43.2 },
      { lat: -21.6, lng: Infinity },
      { lat: -21.7, lng: -43.4 },
    ];
    const result = validTrajectory(pts);
    expect(result).toHaveLength(2);
    expect(result[0].lat).toBe(-21.5);
    expect(result[1].lat).toBe(-21.7);
  });
});
