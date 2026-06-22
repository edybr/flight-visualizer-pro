import { useState } from "react";
import { Heart, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const PIX_KEY = "isaias.oceano@gmail.com";

/**
 * Rodapé global com crédito do autor e opção de doação via Pix.
 * Usado nas páginas internas e públicas.
 */
export default function SiteFooter() {
  const [copied, setCopied] = useState(false);

  const copyPix = () => {
    navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    toast.success("Chave Pix copiada.");
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="no-print border-t border-border/60 bg-card/50 mt-16">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-serif text-base text-foreground">Flight Visualizer Pro</span>
            <span className="text-border">·</span>
            <span>
              by <span className="font-medium text-foreground">Isaias Alves</span>
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Heart className="h-3.5 w-3.5 text-accent" />
              Faça uma doação
            </span>
            <button
              type="button"
              onClick={copyPix}
              className="group flex items-center gap-2 rounded-full border border-border/70 bg-background px-3.5 py-1.5 text-sm transition-transform active:scale-[0.98] hover:border-accent/60"
              aria-label="Copiar chave Pix"
            >
              <span className="text-xs uppercase tracking-wider text-accent">Pix</span>
              <span className="font-mono text-xs text-foreground">{PIX_KEY}</span>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
