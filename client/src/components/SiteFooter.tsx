/**
 * Rodapé global da aplicação.
 * Edite as constantes abaixo para personalizar o conteúdo exibido.
 */

// ── Personalize aqui ──────────────────────────────────────────────────────────
const APP_NAME = "Flight Visualizer Pro"; // Nome exibido no rodapé
const AUTHOR_CREDIT = ""; // Ex.: "by Seu Nome" — deixe vazio para ocultar
const CONTACT_INFO = "Faça uma doação: Pix isaias.oceano@gmail.com"; // texto exibido à direita
// ─────────────────────────────────────────────────────────────────────────────

export default function SiteFooter() {
  return (
    <footer className="no-print border-t border-border/60 bg-card/50 mt-16">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-serif text-base text-foreground">{APP_NAME}</span>
            {AUTHOR_CREDIT && (
              <>
                <span className="text-border">·</span>
                <span>{AUTHOR_CREDIT}</span>
              </>
            )}
          </div>

          {CONTACT_INFO && (
            <div className="text-sm text-muted-foreground">
              {CONTACT_INFO}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
