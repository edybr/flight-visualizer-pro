import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookie } from "cookie";
import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

/**
 * Login próprio com Google OAuth 2.0 — substitui o portal OAuth da Manus, que não
 * funciona fora da plataforma. A sessão reutiliza o mesmo cookie JWT do app
 * (assinado com JWT_SECRET), então o restante do sistema (authenticateRequest) não muda.
 *
 * Variáveis necessárias (no .env do servidor):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET   (Google Cloud Console)
 *   ADMIN_EMAILS                              (opcional, lista separada por vírgula)
 *   GOOGLE_REDIRECT_URI                       (opcional; por padrão é derivado da requisição)
 *
 * Redirect URI a cadastrar no Google: https://SEU_DOMINIO/api/auth/google/callback
 */
const STATE_COOKIE = "g_oauth_state";

function isSecure(req: Request): boolean {
  const fwd = req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim() || req.protocol;
  return proto === "https";
}

function buildRedirectUri(req: Request): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const proto = isSecure(req) ? "https" : "http";
  return `${proto}://${req.headers.host}/api/auth/google/callback`;
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function qp(req: Request, key: string): string | undefined {
  const v = req.query[key];
  return typeof v === "string" ? v : undefined;
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google/login", (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
      res.status(503).json({ error: "Google login não configurado (defina GOOGLE_CLIENT_ID/SECRET)." });
      return;
    }
    const state = nanoid();
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: isSecure(req),
      maxAge: 10 * 60 * 1000,
    });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", buildRedirectUri(req));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
    res.redirect(302, url.toString());
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      res.status(503).json({ error: "Google login não configurado." });
      return;
    }
    try {
      const code = qp(req, "code");
      const state = qp(req, "state");
      const cookies = parseCookie(req.headers.cookie ?? "");
      if (!code || !state || state !== cookies[STATE_COOKIE]) {
        res.status(400).json({ error: "Parâmetro 'state' inválido (proteção CSRF)." });
        return;
      }
      res.clearCookie(STATE_COOKIE, { path: "/" });

      // Troca o code por tokens
      const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: buildRedirectUri(req),
          grant_type: "authorization_code",
        }),
      });
      if (!tokenResp.ok) {
        const body = await tokenResp.text().catch(() => "");
        console.error("[GoogleAuth] token exchange falhou:", tokenResp.status, body);
        res.status(502).json({ error: "Falha ao trocar o código com o Google." });
        return;
      }
      const tokens = (await tokenResp.json()) as { access_token?: string };
      if (!tokens.access_token) {
        res.status(502).json({ error: "Resposta do Google sem access_token." });
        return;
      }

      // Busca o perfil
      const uiResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { authorization: `Bearer ${tokens.access_token}` },
      });
      if (!uiResp.ok) {
        res.status(502).json({ error: "Falha ao obter o perfil do Google." });
        return;
      }
      const info = (await uiResp.json()) as {
        sub?: string;
        email?: string;
        name?: string;
      };
      if (!info.sub) {
        res.status(502).json({ error: "Perfil do Google sem identificador." });
        return;
      }

      const openId = `google:${info.sub}`;
      const email = info.email ?? null;
      const isAdmin = !!email && adminEmails().includes(email.toLowerCase());

      await db.upsertUser({
        openId,
        name: info.name ?? null,
        email,
        loginMethod: "google",
        lastSignedIn: new Date(),
        // Só define role quando for admin, para não rebaixar quem já é admin no banco.
        ...(isAdmin ? { role: "admin" as const } : {}),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: info.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[GoogleAuth] callback falhou:", error);
      res.status(500).json({ error: "Erro no login com o Google." });
    }
  });
}
