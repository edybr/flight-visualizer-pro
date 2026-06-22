import { useAuth } from "@/_core/hooks/useAuth";
import TrajectoryMap from "@/components/TrajectoryMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  FileDown,
  Loader2,
  Pencil,
  Plane,
  Printer,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import SiteFooter from "@/components/SiteFooter";
import { generateTelemetryPdf } from "@/lib/telemetryPdf";
import { APP_VERSION } from "@/const";

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

export default function ActualFlightDetail() {
  const [, params] = useRoute<{ id: string }>("/actual/:id");
  const id = params?.id ? parseInt(params.id, 10) : NaN;
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();

  const query = trpc.actualFlights.get.useQuery({ id }, { enabled: !!user && !isNaN(id) });

  const utils = trpc.useUtils();

  const updateMutation = trpc.actualFlights.update.useMutation({
    onSuccess: () => {
      utils.actualFlights.get.invalidate({ id });
      utils.actualFlights.list.invalidate();
      setEditOpen(false);
      toast.success("Voo atualizado.");
    },
  });

  const deleteMutation = trpc.actualFlights.delete.useMutation({
    onSuccess: () => {
      toast.success("Voo realizado excluído.");
      navigate("/app/actual");
    },
  });

  const enableShare = trpc.actualFlights.enableShare.useMutation({
    onSuccess: () => {
      utils.actualFlights.get.invalidate({ id });
      setShareOpen(true);
    },
  });
  const disableShare = trpc.actualFlights.disableShare.useMutation({
    onSuccess: () => {
      utils.actualFlights.get.invalidate({ id });
      toast.success("Compartilhamento desativado.");
    },
  });

  const [shareOpen, setShareOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editFlightName, setEditFlightName] = useState("");
  const [editLocationLabel, setEditLocationLabel] = useState("");
  const [editDroneModel, setEditDroneModel] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const flight = query.data;

  const shareUrl = useMemo(() => {
    if (!flight?.shareToken) return "";
    return `${window.location.origin}/share-actual/${flight.shareToken}`;
  }, [flight?.shareToken]);

  if (loading || query.isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Voo não encontrado.
      </div>
    );
  }

  const trajectory = Array.isArray(flight.trajectory) ? (flight.trajectory as any[]) : [];
  const maxSpeed = flight.maxSpeedMs ? (flight.maxSpeedMs / 100).toFixed(1) : null;

  const openEdit = () => {
    setEditFlightName(flight.flightName ?? "");
    setEditLocationLabel(flight.locationLabel ?? "");
    setEditDroneModel(flight.droneModel ?? "");
    setEditOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="app-header border-b border-border/60 bg-background/90 backdrop-blur-sm sticky top-0 z-30 no-print">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/app/actual")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <div className="hidden sm:flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                <Plane className="h-4 w-4" />
              </div>
              <div className="font-serif">Voo realizado</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={openEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (flight.shareToken) {
                  setShareOpen(true);
                } else {
                  enableShare.mutate({ id: flight.id });
                }
              }}
              disabled={enableShare.isPending}
            >
              <Share2 className="h-4 w-4 mr-2" /> Compartilhar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!trajectory.length) {
                  toast.error("Sem pontos de telemetria para exportar.");
                  return;
                }
                setExportingPdf(true);
                // Defere para o próximo frame para o spinner aparecer antes do trabalho síncrono.
                window.setTimeout(() => {
                  try {
                    const name = generateTelemetryPdf(
                      {
                        flightName: flight.flightName,
                        droneModel: flight.droneModel,
                        locationLabel: flight.locationLabel,
                        sourceFormat: flight.sourceFormat,
                        sourceFileName: flight.sourceFileName,
                        startedAt: flight.startedAt,
                        endedAt: flight.endedAt,
                        durationSeconds: flight.durationSeconds,
                        distanceMeters: flight.distanceMeters,
                        maxAltitudeMeters: flight.maxAltitudeMeters,
                        maxSpeedMs: flight.maxSpeedMs,
                        pointsCount: flight.pointsCount,
                      },
                      trajectory as any,
                      { appVersion: APP_VERSION },
                    );
                    toast.success(`PDF gerado: ${name}`);
                  } catch (err) {
                    console.error(err);
                    toast.error("Falha ao gerar o PDF de telemetria.");
                  } finally {
                    setExportingPdf(false);
                  }
                }, 50);
              }}
              disabled={exportingPdf}
            >
              {exportingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Exportar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 print-area">
        <div className="mb-6">
          <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground mb-2">
            Trajetória registrada
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

        <div className="space-y-6">
          {/* Mapa maximizado (largura total) */}
          <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm print-card">
            <div className="px-5 py-3 flex items-center justify-between border-b border-border/60">
              <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground">
                Trajetória completa
              </div>
              <div className="text-xs text-muted-foreground">
                {flight.pointsCount ?? trajectory.length} pontos
              </div>
            </div>
            <TrajectoryMap
              trajectory={trajectory as any}
              flightName={flight.flightName}
              height={620}
            />
          </div>

          {/* Informações em grade abaixo do mapa */}
          <aside className="grid gap-6 md:grid-cols-3">
            <DetailCard title="Resumo do voo">
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

            <DetailCard title="Origem do arquivo">
              <DetailRow label="Formato" value={flight.sourceFormat?.toUpperCase()} />
              <DetailRow label="Nome do arquivo" value={flight.sourceFileName} />
              <DetailRow label="Pontos registrados" value={String(flight.pointsCount ?? "—")} />
            </DetailCard>

            <div className="rounded-xl border border-destructive/30 bg-card p-5 no-print">
              <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground mb-3">
                Zona perigosa
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/40 hover:bg-destructive/5"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir voo realizado
              </Button>
            </div>
          </aside>
        </div>
      </main>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar trajetória</DialogTitle>
            <DialogDescription>
              Qualquer pessoa com este link poderá visualizar a trajetória sem login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-sm break-all">
              {shareUrl}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copiado.");
                }}
              >
                <Copy className="h-4 w-4 mr-2" /> Copiar link
              </Button>
              <Button variant="outline" onClick={() => window.open(shareUrl, "_blank")}>
                <Eye className="h-4 w-4 mr-2" /> Abrir
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  disableShare.mutate({ id: flight.id });
                  setShareOpen(false);
                }}
              >
                <X className="h-4 w-4 mr-2" /> Desativar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar voo realizado</DialogTitle>
            <DialogDescription>
              Ajuste os metadados do voo. A trajetória registrada não é alterada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome do voo</Label>
              <Input value={editFlightName} onChange={(e) => setEditFlightName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Local / referência</Label>
              <Input
                value={editLocationLabel}
                onChange={(e) => setEditLocationLabel(e.target.value)}
                placeholder="Ex: Fazenda Boa Vista, Chiador-MG"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Modelo do drone</Label>
              <Input
                value={editDroneModel}
                onChange={(e) => setEditDroneModel(e.target.value)}
                placeholder="Ex: DJI Mavic 3 Enterprise"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                updateMutation.mutate({
                  id,
                  flightName: editFlightName,
                  locationLabel: editLocationLabel || null,
                  droneModel: editDroneModel || null,
                })
              }
              disabled={updateMutation.isPending || !editFlightName.trim()}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Check className="h-4 w-4 mr-2" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir voo realizado?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A trajetória e os metadados serão removidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
