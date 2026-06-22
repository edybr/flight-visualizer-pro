import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyCents } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Check } from "lucide-react";

const INTERVAL_LABEL: Record<string, string> = {
  month: "/mês",
  year: "/ano",
  lifetime: " (vitalício)",
  free: "",
};

export default function AdminPlans() {
  const { data, isLoading } = trpc.admin.plans.useQuery();

  return (
    <AdminLayout
      title="Planos"
      description="Catálogo de planos da plataforma (gratuitos e pagos)"
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((plan) => (
            <Card key={plan.id} className="relative flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-serif text-xl">{plan.name}</CardTitle>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <div className="mb-4">
                  <span className="text-3xl font-semibold">
                    {plan.priceCents === 0
                      ? "Grátis"
                      : formatCurrencyCents(plan.priceCents, plan.currency)}
                  </span>
                  {plan.priceCents > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {INTERVAL_LABEL[plan.interval] ?? ""}
                    </span>
                  )}
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent-foreground" />
                    {plan.maxFlights
                      ? `Até ${plan.maxFlights} voos`
                      : "Voos ilimitados"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent-foreground" />
                    Visualização e telemetria
                  </li>
                  {plan.slug !== "free" && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent-foreground" />
                      Exportação PDF e compartilhamento
                    </li>
                  )}
                  {plan.slug === "business" && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent-foreground" />
                      Suporte prioritário
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          ))}
          {data && data.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
