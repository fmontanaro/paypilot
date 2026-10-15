// Cadastro, login (e-mail ou celular + senha), conta de demonstração e bloqueio por plano.
import type { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { z } from "zod";
import { DEFAULT_PREFS, users, type User } from "@shared/schema";
import { FEATURE_PLAN, hasFeature, PLAN_NAMES, type Feature, type PlanId } from "@shared/plans";
import { db } from "./db";
import { DbSessionStore } from "./session-store";
import { findUserByIdent, getUser, publicUser } from "./storage";
import { seedPersona } from "./seed/seed";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    device?: string;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;

export function deviceLabel(ua = ""): string {
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Navegador";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  if (os === "iPhone" || os === "iPad" || os === "Android") return `${os} · ${br}`;
  return `${br} no ${os}`;
}

export function setupSession(app: Express) {
  const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "paypilot-dev-secret");
  if (!secret) throw new Error("SESSION_SECRET é obrigatório em produção");
  app.set("trust proxy", 1);
  app.use(
    session({
      secret,
      store: new DbSessionStore(SESSION_TTL),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_TTL },
    }),
  );
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const id = req.session.userId;
  if (!id) return res.status(401).json({ error: "Entre na sua conta para continuar." });
  const u = await getUser(id);
  if (!u) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Sessão expirada." });
  }
  req.user = u;
  next();
}

/** Bloqueia escrita em recursos pagos (docs/arquitetura.md › Planos e bloqueios). */
export function requirePlan(feature: Feature) {
  return (req: Request, res: Response, next: NextFunction) => {
    const plan = (req.user?.plan || "gratis") as PlanId;
    if (hasFeature(plan, feature)) return next();
    res.status(402).json({ error: `Recurso do plano ${PLAN_NAMES[FEATURE_PLAN[feature]]}.`, need: FEATURE_PLAN[feature] });
  };
}

function login(req: Request, user: User): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id;
      req.session.device = deviceLabel(req.headers["user-agent"]);
      req.session.save((e) => (e ? reject(e) : resolve()));
    });
  });
}

const identSchema = z
  .string()
  .trim()
  .min(3)
  .transform((s) => (s.includes("@") ? s.toLowerCase() : s.replace(/\D/g, "")))
  .refine((s) => (s.includes("@") ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) : s.length >= 10 && s.length <= 13), "Confira o e-mail ou o celular.");

const signupSchema = z.object({ ident: identSchema, password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."), name: z.string().trim().max(80).optional(), biometric: z.boolean().optional() });
const loginSchema = z.object({ ident: identSchema, password: z.string().min(1) });

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/signup", async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Dados inválidos." });
    const { ident, password, name, biometric } = parsed.data;
    if (await findUserByIdent(ident)) return res.status(409).json({ error: "Já existe uma conta com esse contato. Entre com sua senha." });
    const isEmail = ident.includes("@");
    const [u] = await db()
      .insert(users)
      .values({ email: isEmail ? ident : null, phone: isEmail ? null : ident, name: name || "", passwordHash: await bcrypt.hash(password, 10), prefs: { ...DEFAULT_PREFS, biometric: biometric ?? true } })
      .returning();
    await login(req, u);
    res.status(201).json(publicUser(u));
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Informe o e-mail ou celular e a senha." });
    const u = await findUserByIdent(parsed.data.ident);
    if (!u || !(await bcrypt.compare(parsed.data.password, u.passwordHash))) return res.status(401).json({ error: "E-mail, celular ou senha não conferem." });
    await login(req, u);
    res.json(publicUser(u));
  });

  // Conta de demonstração com a persona do handoff (Marcos), no plano Pilot.
  app.post("/api/auth/demo", async (req, res) => {
    const [u] = await db()
      .insert(users)
      .values({ email: `demo-${nanoid(8).toLowerCase()}@demo.paypilot.app`, name: "Marcos Ribeiro", passwordHash: await bcrypt.hash(nanoid(), 4), plan: "pilot", isDemo: true, onboardedAt: new Date() })
      .returning();
    await seedPersona(u.id);
    await login(req, u);
    res.status(201).json(publicUser((await getUser(u.id))!));
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });
}
