import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

const config: ChartConfig = {
  count: { label: "Total", color: "var(--chart-1)" },
};

function shortDate(d: string) {
  // d no formato YYYY-MM-DD
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return d;
}

export function TrendChart({
  data,
  color = "var(--chart-1)",
  label = "Total",
}: {
  data: { date: string; count: number }[];
  color?: string;
  label?: string;
}) {
  const chartConfig: ChartConfig = {
    count: { label, color },
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Sem dados no período selecionado
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={shortDate}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
        />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(l) => shortDate(String(l))} />}
        />
        <Area
          dataKey="count"
          type="monotone"
          fill="url(#fillCount)"
          stroke={color}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
