import FlightMap from "@/components/FlightMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, Plane, Printer } from "lucide-react";
import { useRoute } from "wouter";
import SiteFooter from "@/components/SiteFooter";

export default function SharedFlight() {
  const [, params] = useRoute<{ token: string }>("/share/:token");
  const token = params?.token ?? "";

  const flightQuery = trpc.flights.getByShareToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  if (flightQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (flightQuery.error || !flightQuery.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="h-12 w-12 rounded-md bg-muted text-muted-foreground flex items-center justify-center mb-4">
          <Plane className="h-5 w-5" />
        </div>
        <h1 className="font-serif text-3xl mb-2">Link inválido</h1>
        <p className="text-muted-foreground max-w-md">
          Este link de compartilhamento foi desativado ou nunca existiu.
        </p>
      </div>
    );
  }

  const flight = flightQuery.data;
  const approved = /aprovado/i.test(flight.status ?? "");

  return (
    <div className="min-h-screen bg-background">
      <header className="app-header border-b border-border/60 bg-background/90 backdrop-blur-sm sticky top-0 z-30 no-print">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Plane className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div>
              <div className="font-serif text-lg leading-none">Flight Visualizer</div>
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
            Protocolo <span className="font-mono ml-2">{flight.protocol}</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl tracking-tight">{flight.operationName}</h1>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <Badge
              variant="outline"
              className={approved ? "border-primary/30 text-primary" : "border-destructive/40 text-destructive"}
            >
              {flight.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {flight.flightType} · {flight.operationType}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm print-card">
              <div className="px-5 py-3 flex items-center justify-between border-b border-border/60">
                <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground">Mapa de voo</div>
                <div className="text-xs text-muted-foreground">
                  Altura vertical: {(flight.requestedArea as any)?.[0]?.vertical_distance ?? "-"} m
                </div>
              </div>
              <FlightMap
                protocol={flight.protocol}
                status={flight.status}
                operationName={flight.operationName}
                requestedArea={flight.requestedArea as any}
                height={520}
              />
            </div>
            {flight.asaReason && (
              <div className="mt-6 rounded-xl border border-border/70 bg-card p-6 print-card">
                <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground mb-2">Motivo da análise</div>
                <p className="leading-relaxed">{flight.asaReason}</p>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <DetailCard title="Operação">
              <DetailRow label="Início" value={flight.operationStart} />
              <DetailRow label="Fim" value={flight.operationFinish} />
              <DetailRow label="Intervalo" value={flight.interval} />
              <DetailRow label="Analisado em" value={flight.analisedAt} />
            </DetailCard>
            <DetailCard title="Responsável">
              <DetailRow label="Nome" value={(flight.operationResponsible as any)?.name} />
              <DetailRow label="Perfil" value={(flight.operationResponsible as any)?.profile} />
            </DetailCard>
            <DetailCard title="Operador padrão">
              <DetailRow label="Nome" value={(flight.defaultOperator as any)?.name} />
              <DetailRow label="Perfil" value={(flight.defaultOperator as any)?.profile} />
            </DetailCard>
            <DetailCard title="Pilotos">
              <ul className="space-y-1.5">
                {((flight.flightPilots as any[]) ?? []).map((p, i) => (
                  <li key={i} className="text-sm font-mono">{p.sarpas_code}</li>
                ))}
              </ul>
            </DetailCard>
            <DetailCard title="Aeronaves">
              <ul className="space-y-2">
                {((flight.aircrafts as any[]) ?? []).map((a, i) => (
                  <li key={i} className="text-sm flex items-center justify-between border-b border-border/40 last:border-0 pb-2 last:pb-0">
                    <span className="font-mono">{a.document_number}</span>
                    <span className="text-muted-foreground text-xs">PMD {a.pmd} kg</span>
                  </li>
                ))}
              </ul>
            </DetailCard>
          </aside>
        </div>

        <div className="mt-12 pt-6 border-t border-border/60 text-center text-xs text-muted-foreground no-print">
          Compartilhado via Flight Visualizer Pro
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
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 text-sm border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right ml-3 truncate max-w-[60%]">{value || "—"}</span>
    </div>
  );
}
