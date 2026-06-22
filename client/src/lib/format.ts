export function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function formatCurrencyCents(cents: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format((cents ?? 0) / 100);
}

export function formatHours(hours: number): string {
  if (!hours || hours <= 0) return "0 h";
  if (hours < 1) {
    const min = Math.round(hours * 60);
    return `${min} min`;
  }
  return `${formatNumber(Math.round(hours * 10) / 10)} h`;
}

export function formatDistanceKm(km: number): string {
  if (!km || km <= 0) return "0 km";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${formatNumber(Math.round(km * 10) / 10)} km`;
}

export function formatPercent(value: number): string {
  return `${(value ?? 0).toFixed(1)}%`;
}
