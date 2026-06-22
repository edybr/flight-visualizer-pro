import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { sdk } from "./_core/sdk";

/**
 * Rotas de login para DESENVOLVIMENTO LOCAL apenas.
 *
 * O login real depende dos servidores OAuth da plataforma Manus, que não estão
 * acessíveis fora dela. Para conseguir usar a aplicação localmente, esta rota
 * cria (ou reutiliza) um usuário de teste, assina o JWT de sessão com o
 * `JWT_SECRET` local e grava o cookie — exatamente o que o callback de OAuth
 * faria em produção.
 *
 * Só é registrada quando `NODE_ENV === "development"` (ver server/_core/index.ts),
 * portanto nunca fica exposta em produção.
 *
 * Uso:
 *   - http://localhost:3000/api/dev-login            → loga como admin
 *   - http://localhost:3000/api/dev-login?role=user  → loga como usuário comum
 *   - http://localhost:3000/api/dev-login?openId=foo&name=Fulano&email=f@x.com
 */
export function registerDevAuthRoutes(app: Express) {
  app.get("/api/dev-login", async (req: Request, res: Response) => {
    try {
      // Fail-closed: em produção o segredo é OBRIGATÓRIO. Sem DEV_LOGIN_SECRET a
      // rota recusa, para que um deploy com ALLOW_DEV_LOGIN=true mas sem segredo
      // não vire um backdoor de admin aberto. Em desenvolvimento o segredo é opcional.
      const requiredSecret = process.env.DEV_LOGIN_SECRET;
      if (process.env.NODE_ENV === "production" && !requiredSecret) {
        res.status(403).json({ error: "dev-login disabled: DEV_LOGIN_SECRET not set" });
        return;
      }
      if (requiredSecret && req.query.secret !== requiredSecret) {
        res.status(403).json({ error: "invalid or missing secret" });
        return;
      }

      const role = req.query.role === "user" ? "user" : "admin";
      const openId =
        typeof req.query.openId === "string" && req.query.openId.length > 0
          ? req.query.openId
          : "dev-local-user";
      const name =
        typeof req.query.name === "string" && req.query.name.length > 0
          ? req.query.name
          : "Dev Local";
      const email =
        typeof req.query.email === "string" && req.query.email.length > 0
          ? req.query.email
          : "dev@local.test";

      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "dev",
        role,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });

      // Cookie compatível com http://localhost (sem HTTPS): sameSite "lax" e
      // secure desligado, ao contrário do fluxo de produção.
      res.cookie(COOKIE_NAME, sessionToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: false,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[DevAuth] dev-login failed", error);
      res.status(500).json({ error: "dev-login failed", detail: String(error) });
    }
  });
}
