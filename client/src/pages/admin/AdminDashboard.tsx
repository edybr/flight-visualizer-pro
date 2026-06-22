import { AdminLayout } from "@/components/admin/AdminLayout";
import { PeriodFilter, type PeriodState } from "@/components/admin/PeriodFilter";
import { StatCard } from "@/components/admin/StatCard";
import { TrendChart } from "@/components/admin/TrendChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrencyCents,
  formatDistanceKm,
  formatHours,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";
import { PERIOD_LABELS } from "@shared/period";
import {
  Activity,
  CreditCard,
  Plane,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-8 flex items-center gap-2 font-serif text-lg font-semibold first:mt-0">
      {children}
    </h2>
  );
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<PeriodState>({ preset: "last30" });

  const { data, isLoading, isFetching } = trpc.admin.dashboard.useQuery(
    {
      preset: period.preset,
      customStart: period.customStart,
      customEnd: period.customEnd,
    },
    { placeholderData: keepPreviousData }
  );

  const periodLabel =
    period.preset === "custom"
      ? "Período personalizado"
      : PERIOD_LABELS[period.preset];

  return (
    <AdminLayout
      title="Visão geral"
      description="Indicadores da plataforma em tempo real"
      actions={<PeriodFilter value={period} onChange={setPeriod} />}
    >
      {isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {/* ============ USUÁRIOS ============ */}
          <SectionTitle>
            <Users className="h-5 w-5 text-primary" /> Usuários
          </SectionTitle>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total cadastrados"
              value={formatNumber(data.users.total)}
              icon={Users}
            />
            <StatCard
              label={`Novos (${periodLabel})`}
              value={formatNumber(data.users.newInPeriod.value)}
              growth={data.users.newInPeriod.growthPercent}
              icon={UserPlus}
              accent
            />
            <StatCard
              label="Ativos hoje"
              value={formatNumber(data.users.activeToday)}
              icon={Activity}
            />
            <StatCard
              label="Ativos no mês"
              value={formatNumber(data.users.activeMonth)}
              hint={`${formatNumber(data.users.activeWeek)} ativos na semana`}
              icon={Activity}
            />
          </div>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Novos usuários ao longo do tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={data.users.series} label="Novos usuários" />
            </CardContent>
          </Card>

          {/* ============ VOOS ============ */}
          <SectionTitle>
            <Plane className="h-5 w-5 text-primary" /> Voos
          </SectionTitle>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total importados"
              value={formatNumber(data.flights.totalImported)}
              icon={Plane}
            />
            <StatCard
              label={`Importados (${periodLabel})`}
              value={formatNumber(data.flights.importedInPeriod.value)}
              growth={data.flights.importedInPeriod.growthPercent}
              icon={TrendingUp}
              accent
            />
            <StatCard
              label="Horas totais de voo"
              value={formatHours(data.flights.totalFlightHours)}
            />
            <StatCard
              label="Distância total"
              value={formatDistanceKm(data.flights.totalDistanceKm)}
              hint={`Média de ${formatNumber(data.flights.avgFlightsPerUser)} voos/usuário`}
            />
          </div>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Voos importados ao longo do tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={data.flights.series}
                label="Voos"
                color="var(--chart-2)"
              />
            </CardContent>
          </Card>

          {/* ============ LEADS ============ */}
          <SectionTitle>
            <Target className="h-5 w-5 text-primary" /> Leads
          </SectionTitle>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label={`Gerados (${periodLabel})`}
              value={formatNumber(data.leads.totalInPeriod.value)}
              growth={data.leads.totalInPeriod.growthPercent}
              icon={Target}
              accent
            />
            <StatCard
              label="Convertidos"
              value={formatNumber(data.leads.converted)}
            />
            <StatCard
              label="Taxa de conversão"
              value={formatPercent(data.leads.conversionRate)}
            />
            <StatCard
              label="Origens"
              value={formatNumber(data.leads.bySource.length)}
              hint={
                data.leads.bySource.length > 0
                  ? data.leads.bySource
                      .slice(0, 2)
                      .map((s) => `${s.source}: ${s.count}`)
                      .join(" · ")
                  : "Sem leads no período"
              }
            />
          </div>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Leads gerados ao longo do tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={data.leads.series}
                label="Leads"
                color="var(--chart-3)"
              />
            </CardContent>
          </Card>

          {/* ============ RECEITA ============ */}
          <SectionTitle>
            <CreditCard className="h-5 w-5 text-primary" /> Receita
          </SectionTitle>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="MRR"
              value={formatCurrencyCents(data.revenue.mrrCents)}
              icon={CreditCard}
              accent
            />
            <StatCard
              label={`Receita (${periodLabel})`}
              value={formatCurrencyCents(data.revenue.revenueInPeriodCents)}
            />
            <StatCard
              label="Receita no ano"
              value={formatCurrencyCents(data.revenue.revenueYearCents)}
            />
            <StatCard
              label="Ticket médio"
              value={formatCurrencyCents(data.revenue.avgTicketCents)}
              hint={`${formatNumber(data.revenue.activeSubscriptions)} assinaturas ativas`}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="LTV (estimado)"
              value={formatCurrencyCents(data.revenue.ltvCents)}
            />
            <StatCard
              label="Churn rate"
              value={formatPercent(data.revenue.churnRate)}
            />
            <StatCard
              label="Receita mensal"
              value={formatCurrencyCents(data.revenue.revenueMonthCents)}
            />
            <StatCard
              label="Assinaturas ativas"
              value={formatNumber(data.revenue.activeSubscriptions)}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Os indicadores de receita refletem a estrutura de assinaturas. Eles serão
            preenchidos automaticamente quando a cobrança (planos pagos) for ativada.
          </p>
        </div>
      )}
    </AdminLayout>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {[0, 1, 2, 3].map((row) => (
        <div key={row}>
          <Skeleton className="mb-3 h-6 w-40" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((c) => (
              <Skeleton key={c} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
