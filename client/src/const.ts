export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Versão da aplicação (incrementada a cada publicação).
export const APP_VERSION = "2.0";

// Login próprio com Google OAuth (rota same-origin no backend), substituindo o
// portal OAuth da Manus. Ver server/googleAuth.ts.
export const getLoginUrl = () => "/api/auth/google/login";
