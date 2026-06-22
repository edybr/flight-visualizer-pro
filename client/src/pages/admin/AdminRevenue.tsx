import { AdminLayout } from "@/components/admin/AdminLayout";
import { PeriodFilter, type PeriodState } from "@/components/admin/PeriodFilter";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyCents, formatNumber, formatPercent } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";
import { CreditCard, Info } from "lucide-react";
import { useState } from "react";

export default function AdminRevenue() {
  const [period, setPeriod] = useState<PeriodState>({ preset: "this_month" });
  const { data, isLoading } = trpc.admin.dashboard.useQuery(
    {
      preset: period.preset,
      customStart: period.customStart,
      customEnd: period.customEnd,
    },
    { placeholderData: keepPreviousData }
  );

  const r = data?.revenue;

  return (
    <AdminLayout
      title="Receita"
      description="Indicadores financeiros (estrutura preparada para cobrança)"
      actions={<PeriodFilter value={period} onChange={setPeriod} />}
    >
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-accent/40 bg-accent/5 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
        <p className="text-muted-foreground">
          A estrutura de receita está pronta. Os valores serão preenchidos automaticamente
          quando os planos pagos e a integração de cobrança forem ativados.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="MRR"
          value={isLoading ? "—" : formatCurrencyCents(r?.mrrCents ?? 0)}
          icon={CreditCard}
          accent
        />
        <StatCard
          label="Receita no período"
          value={isLoading ? "—" : formatCurrencyCents(r?.revenueInPeriodCents ?? 0)}
        />
        <StatCard
          label="Receita mensal"
          value={isLoading ? "—" : formatCurrencyCents(r?.revenueMonthCents ?? 0)}
        />
        <StatCard
          label="Receita anual"
          value={isLoading ? "—" : formatCurrencyCents(r?.revenueYearCents ?? 0)}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Ticket médio"
          value={isLoading ? "—" : formatCurrencyCents(r?.avgTicketCents ?? 0)}
        />
        <StatCard
          label="LTV (estimado)"
          value={isLoading ? "—" : formatCurrencyCents(r?.ltvCents ?? 0)}
        />
        <StatCard
          label="Churn rate"
          value={isLoading ? "—" : formatPercent(r?.churnRate ?? 0)}
        />
        <StatCard
          label="Assinaturas ativas"
          value={isLoading ? "—" : formatNumber(r?.activeSubscriptions ?? 0)}
        />
      </div>

      <Card className="mt-6">
        <CardContent className="p-6">
          <h3 className="font-serif text-base font-semibold">Como a receita é calculada</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">MRR</strong>: soma das assinaturas ativas,
              normalizando planos anuais para o valor mensal equivalente.
            </li>
            <li>
              <strong className="text-foreground">Ticket médio</strong>: MRR dividido pelo
              número de assinaturas ativas.
            </li>
            <li>
              <strong className="text-foreground">Churn</strong>: proporção de assinaturas
              canceladas sobre o total.
            </li>
            <li>
              <strong className="text-foreground">LTV</strong>: ticket médio dividido pela
              taxa de churn (quando houver churn registrado).
            </li>
          </ul>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
