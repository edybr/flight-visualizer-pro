/**
 * Geração do PDF de telemetria do voo realizado (client-side, jsPDF + autotable).
 * Mantém a paleta sofisticada (navy + ivory + dourado) da aplicação.
 *
 * Não toca em importação, autenticação ou trajetória — apenas lê os dados já
 * carregados na página de detalhe e produz um relatório para download.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { PlaybackPoint } from "./playback";
import {
  computeFieldStat,
  elapsedClock,
  FIELD_DECIMALS,
  FIELD_LABEL,
  FIELD_UNIT,
  presentFields,
  sampleTrajectory,
  type TelemetryField,
} from "./telemetry";

/** Cores do tema, em RGB (derivadas das variáveis OKLCH do index.css). */
const NAVY: [number, number, number] = [14, 42, 69];
const IVORY: [number, number, number] = [252, 250, 246];
const FG: [number, number, number] = [20, 27, 36];
const MUTED: [number, number, number] = [91, 100, 111];
const GOLD: [number, number, number] = [224, 174, 87];
const BORDER: [number, number, number] = [217, 223, 229];
const ROW_ALT: [number, number, number] = [246, 244, 239];

export type FlightForPdf = {
  flightName?: string | null;
  droneModel?: string | null;
  locationLabel?: string | null;
  sourceFormat?: string | null;
  sourceFileName?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
  maxAltitudeMeters?: number | null;
  maxSpeedMs?: number | null;
  pointsCount?: number | null;
};

export type PdfOptions = {
  appVersion: string;
  /** Máximo de linhas na tabela de telemetria. <=0 = todos os pontos. */
  maxRows?: number;
  pixKey?: string;
};

function fmtDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function fmtDistance(meters?: number | null): string {
  if (meters === null || meters === undefined) return "—";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function fmtDateTime(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR");
  } catch {
    return d;
  }
}

function safeFileName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 80) || "voo"
  );
}

/**
 * Gera e dispara o download do PDF de telemetria.
 * Retorna o nome do arquivo gerado.
 */
export function generateTelemetryPdf(
  flight: FlightForPdf,
  trajectory: PlaybackPoint[],
  opts: PdfOptions,
): string {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 12;

  const points = Array.isArray(trajectory) ? trajectory : [];
  const fields = presentFields(points);
  const t0 = points[0]?.t;
  const generatedAt = new Date().toLocaleString("pt-BR");

  // ---- Cabeçalho (faixa navy) ----
  const headerH = 26;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, headerH, "F");
  // Filete dourado inferior
  doc.setFillColor(...GOLD);
  doc.rect(0, headerH, pageW, 0.8, "F");

  doc.setTextColor(...IVORY);
  doc.setFont("times", "normal");
  doc.setFontSize(18);
  doc.text("Flight Visualizer Pro", marginX, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text("RELATÓRIO DE TELEMETRIA", marginX, 18);

  doc.setTextColor(...IVORY);
  doc.setFontSize(8);
  doc.text(`v${opts.appVersion}`, pageW - marginX, 11, { align: "right" });
  doc.setTextColor(...BORDER);
  doc.text(`Gerado em ${generatedAt}`, pageW - marginX, 18, { align: "right" });

  // ---- Título do voo ----
  let y = headerH + 10;
  doc.setTextColor(...FG);
  doc.setFont("times", "normal");
  doc.setFontSize(16);
  doc.text(flight.flightName || "Voo realizado", marginX, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const subtitleParts = [
    flight.droneModel,
    flight.locationLabel,
    flight.sourceFormat ? flight.sourceFormat.toUpperCase() : null,
  ].filter(Boolean);
  if (subtitleParts.length) {
    doc.text(subtitleParts.join("   •   "), marginX, y);
  }

  // ---- Resumo do voo (grade de pares) ----
  y += 7;
  const summary: Array<[string, string]> = [
    ["Início", fmtDateTime(flight.startedAt)],
    ["Fim", fmtDateTime(flight.endedAt)],
    ["Duração", fmtDuration(flight.durationSeconds)],
    ["Distância", fmtDistance(flight.distanceMeters)],
    ["Altitude máx.", flight.maxAltitudeMeters ? `${flight.maxAltitudeMeters} m` : "—"],
    [
      "Velocidade máx.",
      flight.maxSpeedMs ? `${(flight.maxSpeedMs / 100).toFixed(1)} m/s` : "—",
    ],
    ["Pontos registrados", String(flight.pointsCount ?? points.length)],
    ["Arquivo", flight.sourceFileName || "—"],
  ];

  const cols = 4;
  const cellW = (pageW - marginX * 2) / cols;
  const cellH = 12;
  summary.forEach(([label, value], i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = marginX + col * cellW;
    const cy = y + row * cellH;
    doc.setDrawColor(...BORDER);
    doc.setFillColor(...IVORY);
    doc.roundedRect(cx, cy, cellW - 3, cellH - 2, 1.2, 1.2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), cx + 3, cy + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...FG);
    doc.text(doc.splitTextToSize(value, cellW - 7)[0] ?? value, cx + 3, cy + 9);
  });

  y += Math.ceil(summary.length / cols) * cellH + 4;

  // ---- Estatísticas de telemetria (mín / máx / média sobre todos os pontos) ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("ESTATÍSTICAS DE TELEMETRIA", marginX, y);
  y += 2;

  const statRows = fields
    .map((f) => {
      const stat = computeFieldStat(points, f);
      if (!stat) return null;
      const unit = FIELD_UNIT[f] ? ` ${FIELD_UNIT[f]}` : "";
      const dec = FIELD_DECIMALS[f];
      return [
        FIELD_LABEL[f] + (FIELD_UNIT[f] ? ` (${FIELD_UNIT[f]})` : ""),
        stat.min.toFixed(dec),
        stat.max.toFixed(dec),
        stat.avg.toFixed(dec),
      ];
    })
    .filter(Boolean) as string[][];

  autoTable(doc, {
    startY: y + 1,
    head: [["Métrica", "Mínimo", "Máximo", "Média"]],
    body: statRows,
    theme: "grid",
    margin: { left: marginX, right: marginX },
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 1.6,
      textColor: FG,
      lineColor: BORDER,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: IVORY,
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  // ---- Tabela de telemetria amostrada ----
  const maxRows = opts.maxRows ?? 600;
  const sampled = sampleTrajectory(points, maxRows);
  const isSampled = sampled.length < points.length;

  const afterStatsY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? y + 30;

  let tableHeadY = afterStatsY + 8;
  if (tableHeadY > pageH - 30) {
    doc.addPage();
    tableHeadY = 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("TELEMETRIA PONTO A PONTO", marginX, tableHeadY);
  if (isSampled) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `Amostra de ${sampled.length} de ${points.length} pontos (intervalo regular)`,
      marginX,
      tableHeadY + 4,
    );
  }

  const head = [
    ["#", "Tempo", "Latitude", "Longitude", ...fields.map((f) => FIELD_LABEL[f])],
  ];

  const body = sampled.map((p, i) => {
    const idx = isSampled
      ? Math.round((i * (points.length - 1)) / Math.max(1, sampled.length - 1))
      : i;
    const row: string[] = [
      String(idx + 1),
      elapsedClock(p.t, t0),
      Number.isFinite(p.lat) ? p.lat.toFixed(6) : "—",
      Number.isFinite(p.lng) ? p.lng.toFixed(6) : "—",
    ];
    for (const f of fields) {
      const v = (p as Record<string, unknown>)[f];
      row.push(typeof v === "number" && Number.isFinite(v) ? v.toFixed(FIELD_DECIMALS[f]) : "—");
    }
    return row;
  });

  const numericCols: Record<number, { halign: "right" }> = {};
  for (let c = 0; c < head[0].length; c++) {
    if (c !== 1) numericCols[c] = { halign: "right" };
  }

  autoTable(doc, {
    startY: tableHeadY + (isSampled ? 7 : 3),
    head,
    body,
    theme: "striped",
    margin: { left: marginX, right: marginX },
    styles: {
      font: "helvetica",
      fontSize: 6,
      cellPadding: 1,
      textColor: FG,
      lineColor: BORDER,
      lineWidth: 0.05,
      overflow: "ellipsize",
    },
    headStyles: {
      fillColor: NAVY,
      textColor: IVORY,
      fontStyle: "bold",
      fontSize: 6,
    },
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles: {
      ...numericCols,
      0: { halign: "right", cellWidth: 10 },
      1: { halign: "center", cellWidth: 14 },
    },
  });

  // ---- Rodapé em todas as páginas (crédito + Pix) ----
  const pix = opts.pixKey ?? "isaias.oceano@gmail.com";
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fy = pageH - 7;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(marginX, fy - 3, pageW - marginX, fy - 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Flight Visualizer Pro  ·  by Isaias Alves", marginX, fy);
    doc.setTextColor(...GOLD);
    doc.text(`Doação Pix: ${pix}`, pageW / 2, fy, { align: "center" });
    doc.setTextColor(...MUTED);
    doc.text(`Página ${p} de ${pageCount}`, pageW - marginX, fy, { align: "right" });
  }

  const fileName = `telemetria_${safeFileName(flight.flightName || "voo")}.pdf`;
  doc.save(fileName);
  return fileName;
}
