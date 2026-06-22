import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { ArrowRight, Map, Plane, ShieldCheck, FileJson, Share2, Printer, Heart } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      navigate("/app");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="app-header border-b border-border/60 backdrop-blur-sm bg-background/80 sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Plane className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div>
              <div className="font-serif text-lg leading-none tracking-tight">Flight Visualizer</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">Pro · SARPAS</div>
            </div>
          </div>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Entrar com Google
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.06] pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle at 20% 20%, oklch(0.28 0.06 250) 0, transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.78 0.12 80) 0, transparent 45%)" }} />
        <div className="container py-24 lg:py-32 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground mb-6">
              Plataforma para Operações Aéreas
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
              A elegância do voo,
              <br />
              em <span className="italic text-primary">cada detalhe</span>.
            </h1>
            <p className="mt-8 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Importe seus arquivos SARPAS, visualize cada operação em um mapa preciso,
              registre anotações operacionais e compartilhe relatórios com a sobriedade
              que sua missão exige.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-7"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                Entrar com Google
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-7"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                Conhecer recursos
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Autenticação segura via Google · dados criptografados em trânsito
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-accent/20 blur-2xl" />
              <div className="relative rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden">
                <div className="h-72 bg-gradient-to-br from-primary/90 to-primary relative">
                  <svg viewBox="0 0 400 280" className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none">
                    <path d="M0,200 Q100,140 200,180 T400,140 L400,280 L0,280 Z" fill="white" />
                    <path d="M0,220 Q120,160 220,200 T400,180 L400,280 L0,280 Z" fill="white" opacity="0.5" />
                  </svg>
                  <div className="absolute top-6 left-6 right-6 flex justify-between text-primary-foreground/90 text-xs tracking-[0.18em] uppercase">
                    <span>Protocolo FDT8U0ET2</span>
                    <span>VLOS · Recreativo</span>
                  </div>
                  <div className="absolute bottom-6 left-6 text-primary-foreground">
                    <div className="text-[10px] tracking-[0.2em] uppercase opacity-80">Área aprovada</div>
                    <div className="font-serif text-2xl">Chiador · MG</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-border">
                  <Stat label="Voos" value="128" />
                  <Stat label="Aprovados" value="92%" />
                  <Stat label="Áreas" value="34" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 bg-secondary/30">
        <div className="container py-24">
          <div className="max-w-2xl mb-16">
            <div className="text-xs tracking-[0.28em] uppercase text-muted-foreground mb-4">
              Recursos
            </div>
            <h2 className="font-serif text-4xl sm:text-5xl leading-tight">
              Tudo o que sua operação precisa,
              <br /> sem ruído visual.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 rounded-xl overflow-hidden">
            <Feature icon={FileJson} title="Importação SARPAS" desc="Validação rigorosa do formato oficial. Arquivos fora do padrão são rejeitados com mensagens claras." />
            <Feature icon={Map} title="Mapa interativo" desc="Polígonos GeoJSON, decolagem e pouso. Popups com protocolo e detalhes." />
            <Feature icon={Plane} title="Filtros precisos" desc="Por data de operação, local ou nome — encontre qualquer voo em segundos." />
            <Feature icon={ShieldCheck} title="Anotações privadas" desc="Cada voo carrega seu próprio caderno operacional, com criação, edição e exclusão." />
            <Feature icon={Share2} title="Compartilhamento público" desc="Gere um link público para um voo específico — leitura sem necessidade de login." />
            <Feature icon={Printer} title="Impressão refinada" desc="Layout dedicado para impressão, com detalhes textuais e o mapa do voo." />
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="container py-10 flex flex-col items-center justify-between gap-5 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} Flight Visualizer Pro</span>
            <span className="text-border">·</span>
            <span>by <span className="font-medium text-foreground">Isaias Alves</span></span>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText("isaias.oceano@gmail.com");
            }}
            className="group flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-1.5 transition-transform active:scale-[0.98] hover:border-accent/60"
            aria-label="Copiar chave Pix para doação"
          >
            <Heart className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs uppercase tracking-wider text-accent">Doe via Pix</span>
            <span className="font-mono text-xs text-foreground">isaias.oceano@gmail.com</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 text-center">
      <div className="font-serif text-2xl">{value}</div>
      <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="bg-card p-8 hover:bg-card/70 transition-colors">
      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-5">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-serif text-xl mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
