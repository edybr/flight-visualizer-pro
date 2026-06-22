import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  growth,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  growth?: number;
  hint?: string;
  accent?: boolean;
}) {
  const showGrowth = typeof growth === "number" && Number.isFinite(growth);
  const up = (growth ?? 0) > 0;
  const down = (growth ?? 0) < 0;

  return (
    <Card className={cn("relative overflow-hidden", accent && "border-accent/40")}>
      {accent && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent" />
      )}
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums leading-none text-foreground">
              {value}
            </p>
            {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        {showGrowth && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                up && "bg-emerald-500/10 text-emerald-600",
                down && "bg-red-500/10 text-red-600",
                !up && !down && "bg-muted text-muted-foreground"
              )}
            >
              {up ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : down ? (
                <ArrowDownRight className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {Math.abs(growth ?? 0).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs. período anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
