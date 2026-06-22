import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contatado" },
  { value: "qualified", label: "Qualificado" },
  { value: "converted", label: "Convertido" },
  { value: "lost", label: "Perdido" },
] as const;

type LeadStatus = (typeof STATUS_OPTIONS)[number]["value"];

export default function AdminLeads() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.leads.useQuery({ limit: 200 });

  const updateStatus = trpc.admin.updateLeadStatus.useMutation({
    onSuccess: () => {
      utils.admin.leads.invalidate();
      utils.admin.dashboard.invalidate();
      toast.success("Status do lead atualizado");
    },
    onError: () => toast.error("Não foi possível atualizar o lead"),
  });

  return (
    <AdminLayout title="Leads / CRM" description="Funil de captação e conversão">
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-[160px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.email ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.company ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.segment ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.source}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.createdAt
                          ? new Date(lead.createdAt).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onValueChange={(v) =>
                            updateStatus.mutate({ id: lead.id, status: v as LeadStatus })
                          }
                        >
                          <SelectTrigger className="h-8 bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data && data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Nenhum lead capturado ainda. Os formulários públicos de interesse
                        alimentarão esta lista automaticamente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
