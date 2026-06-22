import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import {
  Play,
  Pause,
  RotateCcw,
  Gauge,
  ArrowUp,
  BatteryMedium,
  Thermometer,
  Satellite,
  RadioTower,
} from "lucide-react";
import { formatClock, elapsedAtIndex, totalDuration, validTrajectory } from "@/lib/playback";

export type TrajectoryPoint = {
  t?: number;
  lat: number;
  lng: number;
  alt?: number;
  speed?: number;
  altMsl?: number;
  vps?: number;
  battery?: number;
  voltage?: number;
  batTemp?: number;
  gpsNum?: number;
  rcUp?: number;
  rcDown?: number;
  vSpeed?: number;
  heading?: number;
};

type RequestedAreaItem = {
  takeoff_point?: { type: "Point"; coordinates: [number, number] };
  landing_point?: { type: "Point"; coordinates: [number, number] };
  route_coordinates?: { type: "Polygon"; coordinates: number[][][] };
};

interface TrajectoryMapProps {
  trajectory: TrajectoryPoint[];
  flightName?: string;
  height?: number | string;
  className?: string;
  /** Polígono SARPAS opcional para sobrepor (verificar voo realizado vs autorizado) */
  overlayArea?: RequestedAreaItem[] | null;
  /** Exibe o controle de reprodução da trajetória (playback temporal). Default: true */
  enablePlayback?: boolean;
}

// Fix marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Ícone bem pequeno do drone (marcador de reprodução)
const droneIcon = L.divIcon({
  className: "trajectory-drone-marker",
  html:
    '<div style="width:10px;height:10px;border-radius:50%;background:#c9a55a;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.35),0 0 8px rgba(201,165,90,0.9);"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const SPEEDS = [1, 2, 4, 8] as const;

export default function TrajectoryMap({
  trajectory,
  flightName,
  height = 460,
  className,
  overlayArea,
  enablePlayback = true,
}: TrajectoryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayGroupRef = useRef<L.FeatureGroup | null>(null);
  const droneMarkerRef = useRef<L.Marker | null>(null);
  const traveledLineRef = useRef<L.Polyline | null>(null);

  const latlngs = useMemo<L.LatLngTuple[]>(
    () => trajectory.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)).map((p) => [p.lat, p.lng]),
    [trajectory]
  );

  // Pontos válidos (com lat/lng finitos) preservando t/alt/speed para o playback
  const validPoints = useMemo(() => validTrajectory(trajectory), [trajectory]);

  const overlayPolys = useMemo<L.LatLngTuple[][]>(() => {
    const out: L.LatLngTuple[][] = [];
    (overlayArea ?? []).forEach((area) => {
      if (area?.route_coordinates?.coordinates) {
        area.route_coordinates.coordinates.forEach((ring) => {
          out.push(ring.map(([lng, lat]) => [lat, lng] as L.LatLngTuple));
        });
      }
    });
    return out;
  }, [overlayArea]);

  // --- Estado do playback ---
  const [index, setIndex] = useState(0); // índice do ponto atual
  const [playing, setPlaying] = useState(false);
  const [speedMul, setSpeedMul] = useState<(typeof SPEEDS)[number]>(2);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const total = validPoints.length;
  const hasPlayback = enablePlayback && total >= 2;

  // Reseta o playback quando a trajetória muda
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [validPoints]);

  // Tempo decorrido relativo (ms) do ponto atual
  const elapsedMs = useMemo(() => elapsedAtIndex(validPoints, index), [index, validPoints]);
  const totalMs = useMemo(() => totalDuration(validPoints), [validPoints]);

  const cur = validPoints[Math.min(index, Math.max(0, total - 1))];
  const curAlt = cur?.alt;
  const curSpeed = cur?.speed;
  const hasTelemetry =
    cur != null &&
    (cur.battery !== undefined ||
      cur.batTemp !== undefined ||
      cur.gpsNum !== undefined ||
      cur.altMsl !== undefined ||
      cur.rcUp !== undefined);

  // --- Inicialização do mapa ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([-15.78, -47.93], 5);

    const streetsLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri",
      }
    );
    const labelsLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Labels &copy; Esri", pane: "shadowPane" }
    );
    const hybridGroup = L.layerGroup([satelliteLayer, labelsLayer]);

    // Para voos realizados, satélite é o padrão (mais informativo)
    hybridGroup.addTo(map);

    L.control
      .layers(
        {
          "Mapa padrão": streetsLayer,
          Satélite: satelliteLayer,
          "Satélite + rótulos": hybridGroup,
        },
        undefined,
        { position: "topright", collapsed: false }
      )
      .addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      droneMarkerRef.current = null;
      traveledLineRef.current = null;
    };
  }, []);

  // --- Desenho da trajetória e camadas dinâmicas ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove apenas o grupo dinâmico anterior (preserva base layers e seus controles)
    if (overlayGroupRef.current) {
      overlayGroupRef.current.remove();
      overlayGroupRef.current = null;
    }
    droneMarkerRef.current = null;
    traveledLineRef.current = null;

    const group = L.featureGroup().addTo(map);
    overlayGroupRef.current = group;

    // Polígono SARPAS de referência (opcional)
    overlayPolys.forEach((ring) => {
      L.polygon(ring, {
        color: "#c9a55a", // dourado discreto
        weight: 1.5,
        dashArray: "6 4",
        fillColor: "#c9a55a",
        fillOpacity: 0.08,
      })
        .addTo(group)
        .bindPopup("<strong>Área autorizada SARPAS</strong>");
    });

    if (latlngs.length === 0) {
      return;
    }

    // Trajetória principal — linha contínua em navy com halo branco para legibilidade no satélite
    L.polyline(latlngs, {
      color: "#ffffff",
      weight: 6,
      opacity: 0.55,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(group);

    const main = L.polyline(latlngs, {
      color: "#1f3a8a",
      weight: 3,
      opacity: 1,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(group);

    // Linha "percorrida" (destaque dourado) usada durante o playback
    if (hasPlayback) {
      traveledLineRef.current = L.polyline([latlngs[0]], {
        color: "#c9a55a",
        weight: 4,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);
    }

    // Marcadores início (verde) e fim (vermelho)
    const start = latlngs[0];
    const end = latlngs[latlngs.length - 1];

    const startIcon = L.divIcon({
      className: "trajectory-start-marker",
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#15803d;border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.25);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    const endIcon = L.divIcon({
      className: "trajectory-end-marker",
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#b91c1c;border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.25);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    L.marker(start, { icon: startIcon })
      .addTo(group)
      .bindPopup(`<strong>Decolagem</strong>${flightName ? `<br/>${flightName}` : ""}`);
    L.marker(end, { icon: endIcon })
      .addTo(group)
      .bindPopup(`<strong>Pouso</strong>${flightName ? `<br/>${flightName}` : ""}`);

    // Marcador do drone (bem pequeno) para o playback
    if (hasPlayback) {
      droneMarkerRef.current = L.marker(start, { icon: droneIcon, zIndexOffset: 1000 }).addTo(group);
    }

    // Fit bounds
    const allPoints: L.LatLngExpression[] = [...latlngs];
    overlayPolys.forEach((ring) => allPoints.push(...ring));
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    }

    main.bindTooltip(flightName ?? "Trajetória do voo", { sticky: true });
  }, [latlngs, overlayPolys, flightName, hasPlayback]);

  // --- Atualiza posição do drone e a linha percorrida conforme o índice ---
  useEffect(() => {
    if (!hasPlayback) return;
    const marker = droneMarkerRef.current;
    const traveled = traveledLineRef.current;
    const i = Math.min(index, latlngs.length - 1);
    if (marker && latlngs[i]) {
      marker.setLatLng(latlngs[i]);
    }
    if (traveled) {
      traveled.setLatLngs(latlngs.slice(0, i + 1));
    }
  }, [index, latlngs, hasPlayback]);

  // --- Loop de animação ---
  useEffect(() => {
    if (!playing || !hasPlayback) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    lastTickRef.current = performance.now();
    // avança ~12 pontos por segundo na velocidade 1x
    const basePointsPerSec = 12;
    const step = (now: number) => {
      const dt = now - lastTickRef.current;
      const advance = (dt / 1000) * basePointsPerSec * speedMul;
      if (advance >= 1) {
        lastTickRef.current = now;
        setIndex((prev) => {
          const next = prev + Math.floor(advance);
          if (next >= total - 1) {
            setPlaying(false);
            return total - 1;
          }
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, hasPlayback, speedMul, total]);

  const togglePlay = useCallback(() => {
    if (!hasPlayback) return;
    setPlaying((p) => {
      // se está no fim, reinicia ao dar play
      if (!p && index >= total - 1) setIndex(0);
      return !p;
    });
  }, [hasPlayback, index, total]);

  const reset = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeedMul((s) => {
      const idx = SPEEDS.indexOf(s);
      return SPEEDS[(idx + 1) % SPEEDS.length];
    });
  }, []);

  return (
    <div className={className} style={{ width: "100%" }}>
      <div
        ref={containerRef}
        style={{
          height,
          width: "100%",
          borderRadius: hasPlayback ? "12px 12px 0 0" : 12,
          overflow: "hidden",
        }}
      />
      {hasPlayback && (
        <div
          className="flex items-center gap-3 border border-t-0 border-border bg-card px-4 py-3"
          style={{ borderRadius: "0 0 12px 12px" }}
        >
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pausar" : "Reproduzir"}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Reiniciar"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border text-muted-foreground transition-transform active:scale-95 hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <div className="flex flex-1 items-center gap-3">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatClock(elapsedMs)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(1, total - 1)}
              value={Math.min(index, total - 1)}
              onChange={(e) => {
                setPlaying(false);
                setIndex(Number(e.target.value));
              }}
              className="trajectory-slider h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-[#c9a55a]"
              aria-label="Posição da trajetória"
            />
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatClock(totalMs)}
            </span>
          </div>

          <button
            type="button"
            onClick={cycleSpeed}
            className="flex flex-none items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-transform active:scale-95 hover:text-foreground"
            aria-label="Velocidade de reprodução"
          >
            <Gauge className="h-3.5 w-3.5" />
            {speedMul}x
          </button>

          {(curAlt !== undefined || curSpeed !== undefined) && (
            <div className="hidden flex-none items-center gap-3 border-l border-border pl-3 font-mono text-xs tabular-nums text-muted-foreground sm:flex">
              {curAlt !== undefined && <span>{Math.round(curAlt)} m</span>}
              {curSpeed !== undefined && <span>{curSpeed.toFixed(1)} m/s</span>}
            </div>
          )}
        </div>
      )}

      {/* Painel de telemetria sincronizada ao playback */}
      {hasPlayback && hasTelemetry && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <TelemetryCell
            icon={<ArrowUp className="h-3.5 w-3.5" />}
            label="Altitude"
            value={curAlt !== undefined ? `${Math.round(curAlt)} m` : "—"}
            sub={cur?.altMsl !== undefined ? `MSL ${Math.round(cur.altMsl)} m` : undefined}
          />
          <TelemetryCell
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="Velocidade"
            value={curSpeed !== undefined ? `${curSpeed.toFixed(1)} m/s` : "—"}
            sub={cur?.vSpeed !== undefined ? `Vert ${cur.vSpeed.toFixed(1)} m/s` : undefined}
          />
          <TelemetryCell
            icon={<BatteryMedium className="h-3.5 w-3.5" />}
            label="Bateria"
            value={cur?.battery !== undefined ? `${Math.round(cur.battery)} %` : "—"}
            sub={cur?.voltage !== undefined ? `${cur.voltage.toFixed(2)} V` : undefined}
          />
          <TelemetryCell
            icon={<Thermometer className="h-3.5 w-3.5" />}
            label="Temp. bateria"
            value={cur?.batTemp !== undefined ? `${cur.batTemp.toFixed(1)} °C` : "—"}
          />
          <TelemetryCell
            icon={<Satellite className="h-3.5 w-3.5" />}
            label="Satélites GPS"
            value={cur?.gpsNum !== undefined ? `${cur.gpsNum}` : "—"}
          />
          <TelemetryCell
            icon={<RadioTower className="h-3.5 w-3.5" />}
            label="Sinal RC"
            value={cur?.rcUp !== undefined ? `${Math.round(cur.rcUp)} %` : "—"}
            sub={cur?.rcDown !== undefined ? `Down ${Math.round(cur.rcDown)} %` : undefined}
          />
        </div>
      )}
    </div>
  );
}

function TelemetryCell({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="text-accent">{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-mono text-base tabular-nums text-foreground">{value}</div>
      {sub && <div className="font-mono text-[10px] tabular-nums text-muted-foreground">{sub}</div>}
    </div>
  );
}
