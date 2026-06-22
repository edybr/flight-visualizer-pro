/**
 * Base de internacionalização (i18n).
 *
 * Estrutura preparada para múltiplos idiomas. Hoje fornecemos pt-BR como
 * idioma padrão. Para adicionar um novo idioma, replique a estrutura de
 * `ptBR` em uma nova constante (ex: `enUS`) e registre em `DICTIONARIES`.
 *
 * Uso: import { t } from "@/lib/i18n"; t("landing.hero.cta")
 */

export type Locale = "pt-BR" | "en-US";

export const DEFAULT_LOCALE: Locale = "pt-BR";

const ptBR = {
  "common.signIn": "Entrar com Google",
  "common.features": "Conhecer recursos",
  "common.plans": "Planos",
  "common.admin": "Painel administrativo",
  "common.backToApp": "Voltar ao app",
  "landing.badge": "Plataforma para Operações Aéreas",
  "landing.hero.cta": "Comece agora",
  "plans.title": "Planos para cada tipo de operação",
  "plans.subtitle":
    "Do piloto recreativo às empresas de inspeção, mapeamento e perícia técnica.",
  "plans.free": "Gratuito",
  "plans.pro": "Pro",
  "plans.business": "Business",
  "leads.title": "Fale com a gente",
  "leads.subtitle":
    "Conte sobre sua operação e descubra o plano ideal para sua equipe.",
  "leads.name": "Nome",
  "leads.email": "E-mail",
  "leads.company": "Empresa",
  "leads.segment": "Segmento",
  "leads.message": "Mensagem",
  "leads.submit": "Enviar interesse",
  "leads.success": "Recebemos seu interesse! Em breve entraremos em contato.",
  "leads.error": "Não foi possível enviar. Tente novamente.",
} as const;

export type TranslationKey = keyof typeof ptBR;

const DICTIONARIES: Record<Locale, Record<string, string>> = {
  "pt-BR": ptBR,
  "en-US": ptBR, // fallback para pt-BR até traduções en-US serem adicionadas
};

let currentLocale: Locale = DEFAULT_LOCALE;

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: TranslationKey): string {
  const dict = DICTIONARIES[currentLocale] ?? ptBR;
  return dict[key] ?? ptBR[key] ?? key;
}
