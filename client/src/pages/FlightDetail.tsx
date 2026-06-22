import { useAuth } from "@/_core/hooks/useAuth";
import FlightMap from "@/components/FlightMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, Copy, Loader2, Pencil, Plane, Printer, Share2, Trash2, X, Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import SiteFooter from "@/components/SiteFooter";

export default function FlightDetail() {
  const [, params] = useRoute<{ id: string }>("/flights/:id");
  const flightId = params?.id ? parseInt(params.id, 10) : NaN;
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();

  const flightQuery = trpc.flights.get.useQuery(
    { id: flightId },
    { enabled: !!user && !isNaN(flightId) }
  );

  const notesQuery = trpc.notes.listByFlight.useQuery(
    { flightId },
    { enabled: !!user && !isNaN(flightId) }
  );

  const utils = trpc.useUtils();
  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.listByFlight.invalidate({ flightId });
      setNewNote("");
      toast.success("Anotação adicionada.");
    },
  });
  const updateNote = trpc.notes.update.useMutation({
    onSuccess: () => {
      utils.notes.listByFlight.invalidate({ flightId });
      setEditingNoteId(null);
      toast.success("Anotação atualizada.");
    },
  });
  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: () => {
      utils.notes.listByFlight.invalidate({ flightId });
      setDeletingNoteId(null);
      toast.success("Anotação excluída.");
    },
  });

  const enableShare = trpc.flights.enableShare.useMutation({
    onSuccess: () => {
      utils.flights.get.invalidate({ id: flightId });
      setShareOpen(true);
    },
  });
  const disableShare = trpc.flights.disableShare.useMutation({
    onSuccess: () => {
      utils.flights.get.invalidate({ id: flightId });
      toast.success("Compartilhamento desativado.");
    },
  });

  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (flightQuery.data?.shareToken) setShareOpen(false); // don't auto-open just because token exists
  }, [flightQuery.data?.shareToken]);

  const flight = flightQuery.data;

  const shareUrl = useMemo(() => {
    if (!flight?.shareToken) return "";
    return `${window.location.origin}/share/${flight.shareToken}`;
  }, [flight?.shareToken]);

  if (loading || flightQuery.isLoading || !user) {
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

  const approved = /aprovado/i.test(flight.status ?? "");

  return (
    <div className="min-h-screen bg-background">
      <header className="app-header border-b border-border/60 bg-background/90 backdrop-blur-sm sticky top-0 z-30 no-print">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/app")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <div className="hidden sm:flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                <Plane className="h-4 w-4" />
              </div>
              <div className="font-serif">Detalhes do voo</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 print-area">
        {/* Title row */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
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
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map (large) */}
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

            {/* Reason */}
            {flight.asaReason && (
              <div className="mt-6 rounded-xl border border-border/70 bg-card p-6 print-card">
                <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground mb-2">Motivo da análise</div>
                <p className="leading-relaxed">{flight.asaReason}</p>
              </div>
            )}
          </div>

          {/* Sidebar details */}
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
              <DetailRow label="E-mail" value={(flight.operationResponsible as any)?.email} />
            </DetailCard>

            <DetailCard title="Operador padrão">
              <DetailRow label="Nome" value={(flight.defaultOperator as any)?.name} />
              <DetailRow label="Perfil" value={(flight.defaultOperator as any)?.profile} />
              <DetailRow label="E-mail" value={(flight.defaultOperator as any)?.email} />
            </DetailCard>

            <DetailCard title="Pilotos">
              <ul className="space-y-1.5">
                {((flight.flightPilots as any[]) ?? []).map((p, i) => (
                  <li key={i} className="text-sm font-mono">{p.sarpas_code}</li>
                ))}
                {(!flight.flightPilots || (flight.flightPilots as any[]).length === 0) && (
                  <li className="text-sm text-muted-foreground">Nenhum piloto registrado.</li>
                )}
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
                {(!flight.aircrafts || (flight.aircrafts as any[]).length === 0) && (
                  <li className="text-sm text-muted-foreground">Sem aeronaves.</li>
                )}
              </ul>
            </DetailCard>
          </aside>
        </div>

        {/* Notes */}
        <section className="mt-10 no-print">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-2xl">Anotações</h2>
            <span className="text-sm text-muted-foreground">{notesQuery.data?.length ?? 0} nota(s)</span>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-5 mb-4">
            <Textarea
              placeholder="Escreva uma anotação sobre este voo..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={() => createNote.mutate({ flightId, content: newNote.trim() })}
                disabled={!newNote.trim() || createNote.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {createNote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar anotação
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {(notesQuery.data ?? []).map((n) => (
              <div key={n.id} className="rounded-xl border border-border/70 bg-card p-5">
                {editingNoteId === n.id ? (
                  <>
                    <Textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} rows={3} />
                    <div className="flex justify-end gap-2 mt-3">
                      <Button variant="ghost" size="sm" onClick={() => setEditingNoteId(null)}>
                        <X className="h-4 w-4 mr-1" /> Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateNote.mutate({ id: n.id, content: editingContent.trim() })}
                        disabled={!editingContent.trim() || updateNote.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" /> Salvar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap leading-relaxed">{n.content}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString("pt-BR")}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingNoteId(n.id);
                            setEditingContent(n.content);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingNoteId(n.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            {notesQuery.data?.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                Sem anotações por enquanto.
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar voo</DialogTitle>
            <DialogDescription>
              Qualquer pessoa com este link poderá visualizar o voo sem login. Anotações privadas não serão exibidas.
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
                <EyeOff className="h-4 w-4 mr-2" /> Desativar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deletingNoteId !== null} onOpenChange={(o) => !o && setDeletingNoteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir anotação?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingNoteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deletingNoteId && deleteNote.mutate({ id: deletingNoteId })}
              disabled={deleteNote.isPending}
            >
              {deleteNote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
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
