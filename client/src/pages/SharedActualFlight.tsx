import TrajectoryMap from "@/components/TrajectoryMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, Plane, Printer } from "lucide-react";
import { useRoute } from "wouter";
import SiteFooter from "@/components/SiteFooter";

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function formatDistance(meters?: number | null) {
  if (!meters && meters !== 0) return "—";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDateTime(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR");
  } catch {
    return d;
  }
}

export default function SharedActualFlight() {
  const [, params] = useRoute<{ token: string }>("/share-actual/:token");
  const token = params?.token ?? "";

  const query = trpc.actualFlights.getByShareToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  if (query.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Link inválido ou expirado.
      </div>
    );
  }

  const flight = query.data;
  const trajectory = Array.isArray(flight.trajectory) ? (flight.trajectory as any[]) : [];
  const maxSpeed = flight.maxSpeedMs ? (flight.maxSpeedMs / 100).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="app-header border-b border-border/60 bg-background/90 backdrop-blur-sm sticky top-0 z-30 no-print">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Plane className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div className="text-left">
              <div className="font-serif text-lg leading-none tracking-tight">Flight Visualizer</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                Visualização pública
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
        </div>
      </header>

      <main className="container py-8 print-area">
        <div className="mb-6">
          <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground mb-2">
            Voo realizado
            <span className="ml-3 font-mono uppercase">{flight.sourceFormat}</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl tracking-tight">{flight.flightName}</h1>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {flight.droneModel && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                {flight.droneModel}
              </Badge>
            )}
            {flight.locationLabel && (
              <span className="text-sm text-muted-foreground">{flight.locationLabel}</span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm print-card">
              <div className="px-5 py-3 flex items-center justify-between border-b border-border/60">
                <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground">
                  Trajetória
                </div>
                <div className="text-xs text-muted-foreground">
                  {flight.pointsCount ?? trajectory.length} pontos
                </div>
              </div>
              <TrajectoryMap trajectory={trajectory as any} flightName={flight.flightName} height={520} />
            </div>
          </div>

          <aside className="space-y-6">
            <DetailCard title="Resumo">
              <DetailRow label="Início" value={formatDateTime(flight.startedAt)} />
              <DetailRow label="Fim" value={formatDateTime(flight.endedAt)} />
              <DetailRow label="Duração" value={formatDuration(flight.durationSeconds)} />
              <DetailRow label="Distância" value={formatDistance(flight.distanceMeters)} />
              <DetailRow
                label="Altitude máxima"
                value={flight.maxAltitudeMeters ? `${flight.maxAltitudeMeters} m` : "—"}
              />
              <DetailRow label="Velocidade máxima" value={maxSpeed ? `${maxSpeed} m/s` : "—"} />
            </DetailCard>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 print-card">
      <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground mb-3">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
      <span className="text-muted-foreground text-xs uppercase tracking-wider">{label}</span>
      <span className="text-right">{value ?? "—"}</span>
    </div>
  );
}
