import express, { type NextFunction, type Request, type Response } from "express";
import { createServer } from "http";
import { initDb, dbKind } from "./db";
import { registerAuthRoutes, setupSession } from "./auth";
import { registerRoutes } from "./routes";
import { log } from "./log";

const app = express();

app.use(
  express.json({
    limit: "20mb",
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// Cabeçalhos básicos de segurança.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

// Log das chamadas da API (sem corpo: dados financeiros não vão para o log).
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) log(`${req.method} ${req.path} ${res.statusCode} em ${Date.now() - start}ms`);
  });
  next();
});

(async () => {
  await initDb();
  log(`banco: ${dbKind}`);
  setupSession(app);
  registerAuthRoutes(app);
  registerRoutes(app);

  app.use("/api", (_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(err.status || 500).json({ error: "Algo deu errado do nosso lado. Seus dados estão seguros; tente de novo." });
  });

  const server = createServer(app);
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0" }, () => log(`PayPilot em http://localhost:${port}`));
})();
