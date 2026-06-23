import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CalendarDays, FileJson, Loader2, LogOut, Plane, PlaneTakeoff, Route, Search, Upload, LayoutDashboard } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import SiteFooter from "@/components/SiteFooter";
import { APP_VERSION } from "@/const";
import { useSeo } from "@/lib/seo";

export default function Dashboard() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  useSeo({ title: "Meus voos", noindex: true });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filters = useMemo(() => ({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: search || undefined,
    status: status === "all" ? undefined : status,
  }), [startDate, endDate, search, status]);

  const flightsQuery = trpc.flights.list.useQuery(filters, {
    enabled: !!user,
  });

  // Totais (sem filtro) para os badges das abas
  const actualCountQuery = trpc.actualFlights.list.useQuery(
    {},
    { enabled: !!user }
  );
  const actualCount = actualCountQuery.data?.length ?? 0;
  const authorizedCountQuery = trpc.flights.list.useQuery({}, { enabled: !!user });
  const authorizedCount = authorizedCountQuery.data?.length ?? 0;

  const utils = trpc.useUtils();
  const importMutation = trpc.flights.import.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.total} voo(s) importado(s) com sucesso.`);
      utils.flights.list.invalidate();
    },
    onError: (err) => {
      toast.error("Falha na importação", { description: err.message });
    },
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      toast.error("Apenas arquivos .json no formato SARPAS são aceitos.");
      return;
    }
    try {
      const content = await file.text();
      await importMutation.mutateAsync({ content });
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

  const flights = flightsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="app-header border-b border-border/60 bg-background/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate("/")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
              <div className="mt-1 text-[10px] tracking-[0.18em] uppercase text-muted-foreground">Pro · SARPAS</div>
            </div>
          </button>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1 mr-4 rounded-full border border-border/60 bg-muted/60 p-1">
              <button
                onClick={() => navigate("/app")}
                className="flex items-center gap-2 px-3 py-1.5 text-xs tracking-[0.18em] uppercase rounded-full bg-background text-primary shadow-sm"
              >
                <PlaneTakeoff className="h-3.5 w-3.5" /> Autorizados
                <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-medium rounded-full bg-primary/15 text-primary border border-primary/30">
                  {authorizedCount}
                </span>
              </button>
              <button
                onClick={() => navigate("/app/actual")}
                className="flex items-center gap-2 px-3 py-1.5 text-xs tracking-[0.18em] uppercase rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <Route className="h-3.5 w-3.5" /> Realizados
                <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-medium rounded-full bg-accent/20 text-accent border border-accent/40">
                  {actualCount}
                </span>
              </button>
            </nav>
            <button
              onClick={() => navigate("/app/actual")}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 text-xs tracking-wider uppercase rounded-md border border-border/70 text-muted-foreground hover:text-foreground transition-colors"
              title="Voos Realizados"
            >
              <Route className="h-3.5 w-3.5" /> Logs
              {actualCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.1rem] h-4 px-1 text-[9px] font-medium rounded-full bg-accent/20 text-accent border border-accent/40">
                  {actualCount}
                </span>
              )}
            </button>
            {user.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                className="bg-card"
                onClick={() => navigate("/admin")}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" /> Painel admin
              </Button>
            )}
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
        {/* Hero strip */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground mb-3">Painel operacional</div>
            <h1 className="font-serif text-4xl sm:text-5xl tracking-tight">Seus voos, com precisão.</h1>
            <p className="text-muted-foreground mt-3 max-w-xl">
              Importe arquivos SARPAS, refine a busca por data e local, e abra cada operação no mapa.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-5 border-border/70"
              onClick={() => navigate("/app/actual")}
            >
              <Route className="h-4 w-4 mr-2" />
              Voos Realizados
              {actualCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 text-[11px] font-medium rounded-full bg-accent/20 text-accent border border-accent/40">
                  {actualCount}
                </span>
              )}
            </Button>
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
              Importar arquivo SARPAS
            </Button>
          </div>
        </div>

        {/* Filters card */}
        <section className="rounded-xl border border-border/70 bg-card p-6 mb-8 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-1 w-8 bg-accent" />
            <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground">Filtros</div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">De</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Até</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Local, região, nome ou protocolo</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ex: Chiador, CINDACTA II..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Aprovado">Aprovados</SelectItem>
                  <SelectItem value="Negado">Negados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(startDate || endDate || search || status !== "all") && (
            <div className="mt-4 text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSearch("");
                  setStatus("all");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </section>

        {/* Flights list */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-serif text-2xl">Voos</h2>
            <div className="text-sm text-muted-foreground">
              {flightsQuery.isLoading ? "Carregando..." : `${flights.length} resultado(s)`}
            </div>
          </div>

          {flightsQuery.isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : flights.length === 0 ? (
            <EmptyState onImport={() => fileInputRef.current?.click()} />
          ) : (
            <div className="grid gap-3">
              {flights.map((f) => (
                <FlightCard key={f.id} flight={f} onOpen={() => navigate(`/flights/${f.id}`)} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function FlightCard({ flight, onOpen }: { flight: any; onOpen: () => void }) {
  const approved = /aprovado/i.test(flight.status ?? "");
  return (
    <button
      onClick={onOpen}
      className="group text-left rounded-xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-md transition-all p-5 flex items-center gap-5"
    >
      <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${approved ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
        <Plane className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="font-serif text-xl truncate">{flight.operationName || "Operação sem nome"}</div>
          <Badge
            variant="outline"
            className={approved ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive"}
          >
            {approved ? "Aprovado" : "Negado"}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-mono tracking-wider">{flight.protocol}</span>
          <span>{flight.operationStart}{flight.operationFinish && flight.operationFinish !== flight.operationStart ? ` → ${flight.operationFinish}` : ""}</span>
          <span>{flight.interval}</span>
          <span>{flight.flightType} · {flight.operationType}</span>
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
      <h3 className="font-serif text-2xl mb-2">Nenhum voo importado ainda</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Carregue um arquivo JSON no formato SARPAS para começar. Os voos aparecerão aqui com filtros e mapa.
      </p>
      <Button onClick={onImport} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        <Upload className="h-4 w-4 mr-2" />
        Importar arquivo SARPAS
      </Button>
    </div>
  );
}
