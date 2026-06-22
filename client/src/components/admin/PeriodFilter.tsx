import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERIOD_LABELS, type PeriodPreset } from "@shared/period";
import { CalendarRange } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

export interface PeriodState {
  preset: PeriodPreset;
  customStart?: number;
  customEnd?: number;
}

const PRESET_ORDER: PeriodPreset[] = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "last90",
  "this_month",
  "last_month",
  "this_year",
  "custom",
];

function fmt(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function PeriodFilter({
  value,
  onChange,
}: {
  value: PeriodState;
  onChange: (next: PeriodState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(
    value.customStart && value.customEnd
      ? { from: new Date(value.customStart), to: new Date(value.customEnd) }
      : undefined
  );

  const handlePreset = (preset: PeriodPreset) => {
    if (preset === "custom") {
      setOpen(true);
      return;
    }
    onChange({ preset });
  };

  const applyCustom = () => {
    if (range?.from && range?.to) {
      onChange({
        preset: "custom",
        customStart: range.from.getTime(),
        customEnd: range.to.getTime(),
      });
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.preset} onValueChange={(v) => handlePreset(v as PeriodPreset)}>
        <SelectTrigger className="w-[190px] bg-card">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PRESET_ORDER.map((p) => (
            <SelectItem key={p} value={p}>
              {PERIOD_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="bg-card gap-2"
            onClick={() => setOpen(true)}
          >
            <CalendarRange className="h-4 w-4" />
            {value.preset === "custom" && value.customStart && value.customEnd
              ? `${fmt(value.customStart)} — ${fmt(value.customEnd)}`
              : "Personalizado"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={2}
            defaultMonth={range?.from}
          />
          <div className="flex items-center justify-end gap-2 border-t p-3">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={applyCustom}
              disabled={!range?.from || !range?.to}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
