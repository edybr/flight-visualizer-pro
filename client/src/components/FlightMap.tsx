import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";

type RequestedAreaItem = {
  takeoff_point?: { type: "Point"; coordinates: [number, number] };
  landing_point?: { type: "Point"; coordinates: [number, number] };
  route_coordinates?: { type: "Polygon"; coordinates: number[][][] };
  vertical_distance?: number;
};

interface FlightMapProps {
  protocol: string;
  status?: string | null;
  operationName?: string | null;
  requestedArea: RequestedAreaItem[] | null | undefined;
  height?: number | string;
  className?: string;
}

// Fix default Leaflet marker icons (vite/webpack often breaks them)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function isApproved(status?: string | null) {
  if (!status) return false;
  return /aprovado/i.test(status);
}

export default function FlightMap({
  protocol,
  status,
  operationName,
  requestedArea,
  height = 460,
  className,
}: FlightMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayGroupRef = useRef<L.FeatureGroup | null>(null);

  const approved = isApproved(status);
  const polygonColor = approved ? "#1f3a8a" /* navy */ : "#b91c1c"; /* red-700 */
  const polygonFill = approved ? "#3b82f6" : "#ef4444";

  // Build polygon LatLng arrays (Leaflet uses [lat, lng])
  const { polygons, takeoff, landing, allPoints } = useMemo(() => {
    const polys: L.LatLngExpression[][] = [];
    let take: L.LatLngExpression | null = null;
    let land: L.LatLngExpression | null = null;
    const points: L.LatLngExpression[] = [];

    (requestedArea ?? []).forEach((area) => {
      if (area?.route_coordinates?.coordinates) {
        area.route_coordinates.coordinates.forEach((ring) => {
          const latLngs = ring.map(([lng, lat]) => [lat, lng] as L.LatLngTuple);
          polys.push(latLngs);
          points.push(...latLngs);
        });
      }
      if (area?.takeoff_point?.coordinates) {
        const [lng, lat] = area.takeoff_point.coordinates;
        take = [lat, lng];
        points.push([lat, lng]);
      }
      if (area?.landing_point?.coordinates) {
        const [lng, lat] = area.landing_point.coordinates;
        land = [lat, lng];
        points.push([lat, lng]);
      }
    });

    return { polygons: polys, takeoff: take, landing: land, allPoints: points };
  }, [requestedArea]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([-15.78, -47.93], 5);

    // Base layers
    const streetsLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });

    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      }
    );

    const labelsLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Labels &copy; Esri",
        pane: "shadowPane",
      }
    );

    const hybridGroup = L.layerGroup([satelliteLayer, labelsLayer]);

    streetsLayer.addTo(map);

    L.control
      .layers(
        {
          "Mapa padr\u00e3o": streetsLayer,
          "Sat\u00e9lite": satelliteLayer,
          "Sat\u00e9lite + r\u00f3tulos": hybridGroup,
        },
        undefined,
        { position: "topright", collapsed: false }
      )
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render geometry whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove apenas o grupo dinâmico anterior (preserva base layers e seus controles)
    if (overlayGroupRef.current) {
      overlayGroupRef.current.remove();
      overlayGroupRef.current = null;
    }

    const group = L.featureGroup().addTo(map);
    overlayGroupRef.current = group;

    polygons.forEach((ring) => {
      const poly = L.polygon(ring, {
        color: polygonColor,
        weight: 2,
        fillColor: polygonFill,
        fillOpacity: 0.18,
      }).addTo(group);
      poly.bindPopup(
        `<div style="font-family: Inter, sans-serif; min-width:180px">
          <div style="font-size:10px; letter-spacing:0.2em; text-transform:uppercase; color:#6b7280">Protocolo</div>
          <div style="font-weight:600; margin-bottom:6px">${protocol}</div>
          ${operationName ? `<div style="font-size:12px; color:#374151">${operationName}</div>` : ""}
          ${status ? `<div style="font-size:11px; color:${approved ? "#15803d" : "#b91c1c"}; margin-top:6px">${status}</div>` : ""}
        </div>`
      );
    });

    if (takeoff) {
      const m = L.marker(takeoff).addTo(group);
      m.bindPopup(`<strong>Decolagem</strong><br/>Protocolo: ${protocol}`);
    }
    if (landing) {
      // Use a slightly different marker by adjusting opacity
      const m = L.marker(landing, { opacity: 0.85 }).addTo(group);
      m.bindPopup(`<strong>Pouso</strong><br/>Protocolo: ${protocol}`);
    }

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [polygons, takeoff, landing, allPoints, polygonColor, polygonFill, protocol, status, operationName, approved]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, width: "100%", borderRadius: 12, overflow: "hidden" }}
    />
  );
}
