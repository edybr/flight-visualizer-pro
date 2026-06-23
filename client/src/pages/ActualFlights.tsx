import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  CalendarDays,
  FileJson,
  Loader2,
  LogOut,
  MapPin,
  Plane,
  PlaneTakeoff,
  Route as RouteIcon,
  Search,
  Upload,
  FolderTree,
  Copy,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import SiteFooter from "@/components/SiteFooter";
import { APP_VERSION } from "@/const";

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function formatDistance(meters?: number | null) {
  if (!meters && meters !== 0) return "—";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

export default function ActualFlights() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  const filters = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
    }),
    [startDate, endDate, search]
  );

  const query = trpc.actualFlights.list.useQuery(filters, { enabled: !!user });

  const utils = trpc.useUtils();
  const importMutation = trpc.actualFlights.import.useMutation({
    onSuccess: () => {
      toast.success("Voo realizado importado com sucesso.");
      utils.actualFlights.list.invalidate();
    },
    onError: (err) => {
      toast.error("Falha na importação", { description: err.message });
    },
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    const accepted = [".csv", ".kml", ".log", ".txt"];
    if (!accepted.some((ext) => lower.endsWith(ext))) {
      toast.error("Formato não suportado. Aceitamos .csv, .kml, .log e .txt.");
      return;
    }
    // Limite suave de 25 MB para evitar travar o navegador
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 25 MB).");
      return;
    }
    try {
      // Lê os bytes para detectar se é um DJI Fly TXT binário (FlightRecord_*.txt criptografado).
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Heurística: conta bytes não-imprimíveis nos primeiros 4KB.
      const sample = bytes.subarray(0, 4096);
      let nonPrintable = 0;
      for (let i = 0; i < sample.length; i++) {
        const c = sample[i];
        const ok = c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255);
        if (!ok) nonPrintable++;
      }
      const isBinary = sample.length > 0 && nonPrintable / sample.length > 0.15;

      if (isBinary) {
        // Converte para base64 em blocos (evita estourar a pilha de argumentos).
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(
            null,
            Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]
          );
        }
        const base64 = btoa(binary);
        await importMutation.mutateAsync({ binaryBase64: base64, fileName: file.name });
      } else {
        const content = new TextDecoder("utf-8").decode(bytes);
        await importMutation.mutateAsync({ content, fileName: file.name });
      }
    } catch (e) {
      // handled in onError
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rows = query.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="app-header border-b border-border/60 bg-background/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-16">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Plane className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg leading-none tracking-tight">Flight Visualizer</span>
                <span className="rounded-full border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium tabular-nums leading-none text-muted-foreground">
                  v{APP_VERSION}
                </span>
              </div>
              <div className="mt-1 text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                Pro · SARPAS
              </div>
            </div>
          </button>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1 mr-4">
              <button
                onClick={() => navigate("/app")}
                className="flex items-center gap-2 px-3 py-1.5 text-xs tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors border-b-2 border-transparent hover:border-border"
              >
                <PlaneTakeoff className="h-3.5 w-3.5" /> Autorizados
              </button>
              <button
                onClick={() => navigate("/app/actual")}
                className="flex items-center gap-2 px-3 py-1.5 text-xs tracking-[0.18em] uppercase text-primary border-b-2 border-primary"
              >
                <RouteIcon className="h-3.5 w-3.5" /> Realizados
              </button>
            </nav>
            <button
              onClick={() => navigate("/app")}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 text-xs tracking-wider uppercase rounded-md border border-border/70 text-muted-foreground hover:text-foreground transition-colors"
              title="Voos Autorizados"
            >
              <PlaneTakeoff className="h-3.5 w-3.5" /> SARPAS
            </button>
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium">{user.name ?? "Operador"}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => logout().then(() => navigate("/"))}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground mb-3">
              Voos realizados
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl tracking-tight">
              A trajetória, em cada metro.
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl">
              Importe o arquivo <strong className="text-foreground">FlightRecord_*.txt</strong> do DJI Fly
              (decodificação automática no servidor) ou logs já decodificados em .csv / .kml. Veja a rota
              real desenhada com precisão sobre o mapa.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2.5 lg:items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.kml,.log,.txt,text/csv,text/plain,application/vnd.google-earth.kml+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-6"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Importar DJI Fly (.txt / .log / .csv / .kml)
            </Button>
            <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <FolderTree className="h-3.5 w-3.5 flex-none text-accent" />
              <span className="flex-none">No Android:</span>
              <code className="font-mono text-[11px] text-foreground break-all">
                Android/data/dji.go.v5/files/flightrecord
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("Android/data/dji.go.v5/files/flightrecord");
                  toast.success("Caminho copiado.");
                }}
                aria-label="Copiar caminho"
                className="flex-none rounded p-1 transition-colors hover:text-foreground active:scale-95"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <section className="rounded-xl border border-border/70 bg-card p-6 mb-8 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-1 w-8 bg-accent" />
            <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground">Filtros</div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">De</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Até</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Local, drone ou nome do voo
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ex: Mavic 3, fazenda Boa Vista..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          {(startDate || endDate || search) && (
            <div className="mt-4 text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSearch("");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </section>

        {/* Lista */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-serif text-2xl">Trajetórias</h2>
            <div className="text-sm text-muted-foreground">
              {query.isLoading ? "Carregando..." : `${rows.length} resultado(s)`}
            </div>
          </div>

          {query.isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState onImport={() => fileInputRef.current?.click()} />
          ) : (
            <div className="grid gap-3">
              {rows.map((r: any) => (
                <ActualFlightCard
                  key={r.id}
                  flight={r}
                  onOpen={() => navigate(`/actual/${r.id}`)}
                  formatDate={formatDate}
                  formatDuration={formatDuration}
                  formatDistance={formatDistance}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ActualFlightCard({
  flight,
  onOpen,
  formatDate,
  formatDuration,
  formatDistance,
}: {
  flight: any;
  onOpen: () => void;
  formatDate: (d?: string | null) => string;
  formatDuration: (s?: number | null) => string;
  formatDistance: (m?: number | null) => string;
}) {
  return (
    <button
      onClick={onOpen}
      className="group text-left rounded-xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-md transition-all p-5 flex items-center gap-5"
    >
      <div className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
        <RouteIcon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="font-serif text-xl truncate">{flight.flightName}</div>
          <Badge variant="outline" className="border-accent/40 text-accent-foreground text-[10px] uppercase tracking-wider">
            {flight.sourceFormat}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {formatDate(flight.flightDate)}
          </span>
          <span>Duração: {formatDuration(flight.durationSeconds)}</span>
          <span>Distância: {formatDistance(flight.distanceMeters)}</span>
          <span>
            Alt. máx: {flight.maxAltitudeMeters ? `${flight.maxAltitudeMeters} m` : "—"}
          </span>
          {flight.locationLabel && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {flight.locationLabel}
            </span>
          )}
          {flight.droneModel && <span>{flight.droneModel}</span>}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-card/50 p-16 text-center">
      <div className="h-12 w-12 mx-auto rounded-full bg-accent/20 text-accent-foreground flex items-center justify-center mb-4">
        <FileJson className="h-6 w-6" />
      </div>
      <h3 className="font-serif text-2xl mb-2">Nenhum voo realizado importado</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Envie o arquivo <strong className="text-foreground">FlightRecord_*.txt</strong> gerado pelo app DJI Fly
        — ele é decodificado automaticamente no servidor. Também aceitamos CSV/KML decodificados pelo{" "}
        <a
          href="https://www.phantomhelp.com/LogViewer/"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          Phantom Help LogViewer
        </a>
        .
      </p>
      <Button onClick={onImport} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        <Upload className="h-4 w-4 mr-2" />
        Importar log
      </Button>
    </div>
  );
}
