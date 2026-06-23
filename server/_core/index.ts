import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerDevAuthRoutes } from "../devAuth";
import { registerGoogleAuthRoutes } from "../googleAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Login próprio com Google OAuth (substitui o portal Manus). Ver server/googleAuth.ts.
  registerGoogleAuthRoutes(app);
  // Login de desenvolvimento. Em produção só é habilitado se ALLOW_DEV_LOGIN=true
  // E DEV_LOGIN_SECRET estiver definido (fail-closed): sem o segredo a rota não é
  // registrada, evitando um backdoor de admin aberto por configuração incompleta.
  const devLoginRequested =
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_DEV_LOGIN === "true";
  if (devLoginRequested) {
    if (process.env.NODE_ENV === "production" && !process.env.DEV_LOGIN_SECRET) {
      console.warn(
        "[DevAuth] ALLOW_DEV_LOGIN=true mas DEV_LOGIN_SECRET não definido — rota /api/dev-login NÃO registrada (fail-closed)."
      );
    } else {
      registerDevAuthRoutes(app);
    }
  }

  // SEO: sitemap.xml dinâmico com URLs absolutas (o domínio só é conhecido em runtime)
  app.get("/sitemap.xml", (req, res) => {
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const host = req.headers.host || "";
    const base = `${proto}://${host}`;
    const urls = [
      { loc: `${base}/`, priority: "1.0" },
      { loc: `${base}/planos`, priority: "0.8" },
    ];
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      )
      .join("\n")}\n</urlset>\n`;
    res.setHeader("Content-Type", "application/xml");
    res.send(body);
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
