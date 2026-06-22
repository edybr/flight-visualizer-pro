import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { useSeo } from "@/lib/seo";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, Plane } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const SEGMENTS = [
  "Piloto autônomo",
  "Inspeção",
  "Mapeamento",
  "Agricultura de precisão",
  "Audiovisual",
  "Perícia técnica",
  "Outro",
];

export default function Plans() {
  useSeo({
    title: "Planos e preços",
    description:
      "Conheça os planos do Flight Visualizer Pro para pilotos de drone, inspeção, mapeamento, agricultura de precisão, audiovisual e perícia técnica.",
    path: "/planos",
  });

  const { data: plans } = trpc.leads.listPlans.useQuery(undefined, {
    // Em caso de falha de rede, caímos no fallback estático abaixo.
    retry: false,
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    segment: "",
    message: "",
  });

  const submitLead = trpc.leads.submit.useMutation({
    onSuccess: () => {
      toast.success("Recebemos seu interesse! Em breve entraremos em contato.");
      setForm({ name: "", email: "", company: "", segment: "", message: "" });
    },
    onError: () => toast.error("Não foi possível enviar. Tente novamente."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    submitLead.mutate({
      name: form.name,
      email: form.email,
      company: form.company || undefined,
      segment: form.segment || undefined,
      message: form.message || undefined,
      source: "landing-planos",
    });
  };

  const fallbackPlans = [
    {
      slug: "free",
      name: "Gratuito",
      description: "Para começar a visualizar seus voos.",
      price: "Grátis",
      features: ["Até 5 voos", "Visualização e telemetria", "Mapa interativo"],
    },
    {
      slug: "pro",
      name: "Pro",
      description: "Para pilotos profissionais.",
      price: "R$ 49,90/mês",
      features: [
        "Voos ilimitados",
        "Exportação PDF e compartilhamento",
        "Telemetria completa",
      ],
      highlight: true,
    },
    {
      slug: "business",
      name: "Business",
      description: "Para empresas e equipes.",
      price: "R$ 149,90/mês",
      features: ["Tudo do Pro", "Múltiplos usuários", "Suporte prioritário"],
    },
  ];

  const display =
    plans && plans.length > 0
      ? plans.map((p) => ({
          slug: p.slug,
          name: p.name,
          description: p.description ?? "",
          price:
            p.priceCents === 0
              ? "Grátis"
              : `R$ ${(p.priceCents / 100).toFixed(2).replace(".", ",")}${
                  p.interval === "month" ? "/mês" : p.interval === "year" ? "/ano" : ""
                }`,
          features: [
            p.maxFlights ? `Até ${p.maxFlights} voos` : "Voos ilimitados",
            "Visualização e telemetria",
            p.slug !== "free" ? "Exportação PDF e compartilhamento" : "Mapa interativo",
          ],
          highlight: p.slug === "pro",
        }))
      : fallbackPlans;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="app-header sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Plane className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div>
              <div className="font-serif text-lg leading-none tracking-tight">
                Flight Visualizer
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Pro · SARPAS
              </div>
            </div>
          </Link>
          <Button onClick={() => (window.location.href = getLoginUrl())}>
            Entrar com Google
          </Button>
        </div>
      </header>

      <section className="container py-16 lg:py-24">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à página inicial
        </Link>
        <div className="max-w-2xl">
          <div className="mb-4 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Planos e preços
          </div>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            Planos para cada tipo de operação
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Do piloto recreativo às empresas de inspeção, mapeamento, agricultura de
            precisão, audiovisual e perícia técnica.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {display.map((plan) => (
            <Card
              key={plan.slug}
              className={
                plan.highlight
                  ? "relative border-accent/50 shadow-lg ring-1 ring-accent/30"
                  : "relative"
              }
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  Mais popular
                </div>
              )}
              <CardContent className="flex h-full flex-col p-6">
                <h3 className="font-serif text-xl">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-4 text-3xl font-semibold">{plan.price}</div>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent-foreground" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() =>
                    plan.slug === "free"
                      ? (window.location.href = getLoginUrl())
                      : document
                          .getElementById("contato")
                          ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {plan.slug === "free" ? "Começar grátis" : "Falar com vendas"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Captura de leads */}
      <section id="contato" className="border-t border-border/60 bg-secondary/30">
        <div className="container grid gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <div className="mb-4 text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Fale com a gente
            </div>
            <h2 className="font-serif text-3xl leading-tight sm:text-4xl">
              Conte sobre sua operação
            </h2>
            <p className="mt-4 text-muted-foreground">
              Preencha o formulário e nossa equipe ajudará a escolher o plano ideal para a
              sua necessidade.
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="company">Empresa</Label>
                    <Input
                      id="company"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="segment">Segmento</Label>
                    <Select
                      value={form.segment}
                      onValueChange={(v) => setForm({ ...form, segment: v })}
                    >
                      <SelectTrigger id="segment" className="bg-card">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEGMENTS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    rows={3}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitLead.isPending}
                >
                  {submitLead.isPending ? "Enviando..." : "Enviar interesse"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
