// Rotas da API (docs/arquitetura.md › API). Todas exigem sessão, exceto auth e webhook.
import type { Express, NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as S from "@shared/schema";
import { CATEGORY_BY_ID } from "@shared/categories";
import { rulePattern } from "@shared/engine";
import { monthKey } from "@shared/format";
import { hasFeature, PLAN_RANK, type PlanId } from "@shared/plans";
import { db } from "./db";
import { requireAuth, requirePlan } from "./auth";
import { deleteUserData, endSession, loadAppData, publicUser, todayBR, userSessions } from "./storage";
import { afterImport, importFile } from "./ingestion";
import { sampleFiles } from "./seed/samples";
import { BANKS, provider } from "./openfinance";
import { canUseSandbox, disconnectSandboxConnection, REAL_OPEN_FINANCE_UNAVAILABLE } from "./openfinance/disconnect";
import { contributionInput, GoalContributionError, recordGoalContribution } from "./goals/contributions";
import { createIncome, deleteIncome, IncomeError, listIncomes, updateIncome } from "./incomes";
import { ChatLimitError, handleAction, handleMessage, history } from "./assistant";
import { getLink, onIncoming, startLink, verifyLink, VERIFY_TOKEN } from "./whatsapp";

type H = (req: Request, res: Response) => Promise<unknown>;
/** Encapsula erros: zod vira 400, o resto vira 500 com mensagem simples. */
const wrap = (h: H) => (req: Request, res: Response, next: NextFunction) =>
  h(req, res).catch((e) => {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message || "Dados inválidos." });
    if (e instanceof ChatLimitError) return res.status(402).json({ error: e.message, need: "plus" });
    if (e instanceof HttpError || e instanceof GoalContributionError || e instanceof IncomeError) return res.status(e.status).json({ error: e.message });
    next(e);
  });

class HttpError extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

const uid = (req: Request) => req.user!.id;
const money = z.coerce.number().finite().positive().max(10_000_000);

/** Garante que a linha pertence ao usuário antes de alterar. */
async function owned<T extends { id: string; userId: string }>(table: { id: unknown; userId: unknown } & object, id: string, userId: string): Promise<T> {
  const t = table as unknown as typeof S.accounts;
  const [row] = await db()
    .select()
    .from(t)
    .where(and(eq(t.id, id), eq(t.userId, userId)));
  if (!row) throw new HttpError(404, "Não encontrado.");
  return row as unknown as T;
}

export function registerRoutes(app: Express) {
  const auth = requireAuth;

  // ---------- Conta e perfil ----------
  app.get("/api/me", auth, (req, res) => res.json(publicUser(req.user!)));

  app.patch(
    "/api/me",
    auth,
    wrap(async (req, res) => {
      const body = z
        .object({
          name: z.string().trim().max(80).optional(),
          prefs: z
            .object({
              theme: z.enum(["claro", "escuro", "sistema"]).optional(),
              biometric: z.boolean().optional(),
              notifications: z.object({ teto: z.boolean(), venc: z.boolean(), sem: z.boolean(), ext: z.boolean() }).partial().optional(),
              importReminder: z.boolean().optional(),
              debtBudget: z.coerce.number().min(0).max(10_000_000).optional(),
            })
            .optional(),
          onboarded: z.boolean().optional(),
        })
        .parse(req.body);
      const u = req.user!;
      const prefs = { ...u.prefs, ...(body.prefs || {}), notifications: { ...u.prefs.notifications, ...(body.prefs?.notifications || {}) } };
      const [n] = await db()
        .update(S.users)
        .set({ name: body.name ?? u.name, prefs, onboardedAt: body.onboarded ? u.onboardedAt ?? new Date() : u.onboardedAt })
        .where(eq(S.users.id, u.id))
        .returning();
      res.json(publicUser(n));
    }),
  );

  app.put(
    "/api/me/plan",
    auth,
    wrap(async (req, res) => {
      const { plan } = z.object({ plan: z.enum(["gratis", "plus", "pilot"]) }).parse(req.body);
      const allow = process.env.ALLOW_PLAN_SWITCH ? process.env.ALLOW_PLAN_SWITCH === "true" : process.env.NODE_ENV !== "production";
      if (!allow && PLAN_RANK[plan as PlanId] > PLAN_RANK[req.user!.plan as PlanId]) throw new HttpError(501, "A assinatura pelo app chega em breve.");
      const [n] = await db().update(S.users).set({ plan }).where(eq(S.users.id, uid(req))).returning();
      res.json(publicUser(n));
    }),
  );

  app.get(
    "/api/me/sessions",
    auth,
    wrap(async (req, res) => {
      const list = await userSessions(uid(req));
      res.json(list.map((s) => ({ id: crypto.createHash("sha1").update(s.sid).digest("hex").slice(0, 16), device: s.device || "Navegador", lastSeenAt: s.lastSeenAt, current: s.sid === req.sessionID })));
    }),
  );

  app.delete(
    "/api/me/sessions/:id",
    auth,
    wrap(async (req, res) => {
      const list = await userSessions(uid(req));
      const s = list.find((x) => crypto.createHash("sha1").update(x.sid).digest("hex").slice(0, 16) === req.params.id);
      if (!s) throw new HttpError(404, "Sessão não encontrada.");
      if (s.sid === req.sessionID) throw new HttpError(400, "Para sair deste aparelho, use “Sair da conta”.");
      await endSession(uid(req), s.sid);
      res.json({ ok: true });
    }),
  );

  // LGPD: exportar e apagar tudo.
  app.get(
    "/api/me/export",
    auth,
    wrap(async (req, res) => {
      const data = await loadAppData(uid(req));
      res.setHeader("Content-Disposition", `attachment; filename="paypilot-dados-${data.today}.json"`);
      res.json({ exportadoEm: new Date().toISOString(), ...data });
    }),
  );

  app.delete(
    "/api/me",
    auth,
    wrap(async (req, res) => {
      await deleteUserData(uid(req));
      req.session.destroy(() => res.json({ ok: true }));
    }),
  );

  // ---------- Leitura ----------
  app.get(
    "/api/snapshot",
    auth,
    wrap(async (req, res) => res.json(await loadAppData(uid(req)))),
  );

  // ---------- Rendas (todos os planos) ----------
  app.get("/api/incomes", auth, wrap(async (req, res) => res.json(await listIncomes(db(), uid(req)))));
  app.post("/api/incomes", auth, wrap(async (req, res) => res.status(201).json(await createIncome(db(), uid(req), req.body))));
  app.patch("/api/incomes/:id", auth, wrap(async (req, res) => res.json(await updateIncome(db(), uid(req), req.params.id, req.body))));
  app.delete("/api/incomes/:id", auth, wrap(async (req, res) => res.json(await deleteIncome(db(), uid(req), req.params.id))));

  // ---------- Gastos ----------
  app.post(
    "/api/transactions",
    auth,
    wrap(async (req, res) => {
      const b = z.object({ description: z.string().trim().min(1).max(120), amount: money, categoryId: z.string().optional(), accountId: z.string().nullable().optional(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(req.body);
      if (b.accountId) await owned(S.accounts, b.accountId, uid(req));
      const [t] = await db()
        .insert(S.transactions)
        .values({ userId: uid(req), description: b.description, amount: b.amount, categoryId: b.categoryId && CATEGORY_BY_ID[b.categoryId] ? b.categoryId : "compras", accountId: b.accountId ?? null, date: b.date || monthKeyDay(), fingerprint: `manual-${nanoid(12)}` })
        .returning();
      res.status(201).json(t);
    }),
  );

  app.patch(
    "/api/transactions/:id",
    auth,
    wrap(async (req, res) => {
      const b = z
        .object({
          categoryId: z.string().optional(),
          groupId: z.string().nullable().optional(),
          notes: z.string().max(500).nullable().optional(),
          splits: z.array(z.object({ target: z.enum(["fatura", "divida_pessoal"]), targetId: z.string(), amount: money })).optional(),
          createRule: z.boolean().optional(),
        })
        .parse(req.body);
      const t = await owned<S.Transaction>(S.transactions, req.params.id, uid(req));
      if (b.categoryId && !CATEGORY_BY_ID[b.categoryId]) throw new HttpError(400, "Categoria inválida.");
      if (b.groupId) await owned(S.expenseGroups, b.groupId, uid(req));
      const [n] = await db()
        .update(S.transactions)
        .set({ categoryId: b.categoryId ?? t.categoryId, groupId: b.groupId === undefined ? t.groupId : b.groupId, notes: b.notes === undefined ? t.notes : b.notes })
        .where(eq(S.transactions.id, t.id))
        .returning();
      if (b.splits) {
        if (b.splits.reduce((s, x) => s + x.amount, 0) > Math.abs(t.amount) + 0.01) throw new HttpError(400, "As partes somam mais que a transação.");
        await db().delete(S.transactionSplits).where(eq(S.transactionSplits.transactionId, t.id));
        if (b.splits.length) await db().insert(S.transactionSplits).values(b.splits.map((s) => ({ ...s, userId: uid(req), transactionId: t.id })));
        // A parte que abate dívida pessoal vira pagamento registrado.
        for (const s of b.splits.filter((x) => x.target === "divida_pessoal")) {
          await owned(S.personalDebts, s.targetId, uid(req));
          await db().delete(S.personalDebtPayments).where(and(eq(S.personalDebtPayments.transactionId, t.id), eq(S.personalDebtPayments.userId, uid(req))));
          await db().insert(S.personalDebtPayments).values({ userId: uid(req), debtId: s.targetId, date: t.date, amount: s.amount, method: "Parte de um Pix", transactionId: t.id });
        }
      }
      if (b.createRule) {
        const pattern = rulePattern(t.description);
        await db().insert(S.categoryRules).values({ userId: uid(req), pattern, categoryId: n.categoryId, groupId: n.groupId, label: `“${pattern}”` });
      }
      res.json(n);
    }),
  );

  app.post(
    "/api/budgets",
    auth,
    requirePlan("tetos"),
    wrap(async (req, res) => {
      const b = z.object({ categoryId: z.string(), monthlyLimit: money }).parse(req.body);
      const cat = CATEGORY_BY_ID[b.categoryId];
      if (!cat) throw new HttpError(400, "Categoria inválida.");
      const existing = await db().select().from(S.budgets).where(and(eq(S.budgets.userId, uid(req)), eq(S.budgets.categoryId, b.categoryId)));
      if (existing[0]) {
        const [n] = await db().update(S.budgets).set({ monthlyLimit: b.monthlyLimit }).where(eq(S.budgets.id, existing[0].id)).returning();
        return res.json(n);
      }
      const [n] = await db().insert(S.budgets).values({ userId: uid(req), categoryId: b.categoryId, label: cat.name, monthlyLimit: b.monthlyLimit }).returning();
      // O teto entra nas prioridades do mês como envelope (essencial) ou item cortável (supérfluo).
      await db().insert(S.commitments).values({ userId: uid(req), name: cat.name, kind: cat.essential ? "teto" : "envelope", amount: b.monthlyLimit, dueText: cat.essential ? "Teto do mês" : "Ao longo do mês", cuttable: !cat.essential, sort: 900 });
      res.status(201).json(n);
    }),
  );

  app.patch(
    "/api/budgets/:id",
    auth,
    requirePlan("tetos"),
    wrap(async (req, res) => {
      const b = z.object({ monthlyLimit: money }).parse(req.body);
      await owned(S.budgets, req.params.id, uid(req));
      const [n] = await db().update(S.budgets).set({ monthlyLimit: b.monthlyLimit }).where(eq(S.budgets.id, req.params.id)).returning();
      res.json(n);
    }),
  );

  app.patch(
    "/api/leaks/:id",
    auth,
    wrap(async (req, res) => {
      const b = z.object({ status: z.enum(["aberto", "uso", "ignorado", "cancelado"]), protocol: z.string().max(80).nullable().optional() }).parse(req.body);
      if (!hasFeature(req.user!.plan as PlanId, "vazamentos_completo")) throw new HttpError(402, "Recurso do plano Plus.");
      await owned(S.leaks, req.params.id, uid(req));
      const [n] = await db().update(S.leaks).set({ status: b.status, protocol: b.protocol ?? null, updatedAt: new Date() }).where(eq(S.leaks.id, req.params.id)).returning();
      res.json(n);
    }),
  );

  app.post(
    "/api/subscriptions/:id/checkin",
    auth,
    requirePlan("checkin"),
    wrap(async (req, res) => {
      const b = z.object({ used: z.boolean() }).parse(req.body);
      await owned(S.subscriptions, req.params.id, uid(req));
      const [n] = await db()
        .update(S.subscriptions)
        .set({ checkin: b.used ? "usei" : "nao_usei", checkinMonth: monthKey(todayBR()) })
        .where(eq(S.subscriptions.id, req.params.id))
        .returning();
      if (!b.used) await afterImport(uid(req));
      res.json(n);
    }),
  );

  app.post(
    "/api/subscriptions/checkin/reset",
    auth,
    requirePlan("checkin"),
    wrap(async (req, res) => {
      await db().update(S.subscriptions).set({ checkin: null, checkinMonth: null }).where(eq(S.subscriptions.userId, uid(req)));
      res.json({ ok: true });
    }),
  );

  // ---------- Plano ----------
  app.put(
    "/api/priorities/:commitmentId",
    auth,
    requirePlan("prioridades"),
    wrap(async (req, res) => {
      const b = z.object({ section: z.enum(["pagar", "parcelar", "negociar", "cortar"]) }).parse(req.body);
      await owned(S.commitments, req.params.commitmentId, uid(req));
      const month = monthKey(todayBR());
      await db()
        .insert(S.priorityDecisions)
        .values({ userId: uid(req), month, commitmentId: req.params.commitmentId, section: b.section })
        .onConflictDoUpdate({ target: [S.priorityDecisions.userId, S.priorityDecisions.month, S.priorityDecisions.commitmentId], set: { section: b.section, updatedAt: new Date() } });
      res.json({ ok: true });
    }),
  );

  app.put(
    "/api/rollover/choice",
    auth,
    requirePlan("rolagem"),
    wrap(async (req, res) => {
      const b = z.object({ commitmentId: z.string(), route: z.enum(["parcelar", "outro_cartao", "cheque"]) }).parse(req.body);
      await owned(S.commitments, b.commitmentId, uid(req));
      const month = monthKey(todayBR());
      await db()
        .insert(S.rolloverChoices)
        .values({ userId: uid(req), month, commitmentId: b.commitmentId, route: b.route })
        .onConflictDoUpdate({ target: [S.rolloverChoices.userId, S.rolloverChoices.month, S.rolloverChoices.commitmentId], set: { route: b.route, updatedAt: new Date() } });
      // Parcelar pelo otimizador também move a fatura para "Parcelar" nas prioridades.
      if (b.route === "parcelar")
        await db()
          .insert(S.priorityDecisions)
          .values({ userId: uid(req), month, commitmentId: b.commitmentId, section: "parcelar" })
          .onConflictDoUpdate({ target: [S.priorityDecisions.userId, S.priorityDecisions.month, S.priorityDecisions.commitmentId], set: { section: "parcelar", updatedAt: new Date() } });
      res.json({ ok: true });
    }),
  );

  // ---------- Metas ----------
  app.post(
    "/api/goals",
    auth,
    requirePlan("metas"),
    wrap(async (req, res) => {
      const b = z.object({ name: z.string().trim().min(1).max(60), icon: z.string().max(40), target: money, months: z.coerce.number().int().min(1).max(120), sources: z.array(z.string()).max(10) }).parse(req.body);
      const [g] = await db()
        .insert(S.goals)
        .values({ userId: uid(req), name: b.name, icon: b.icon, target: b.target, months: b.months, startMonth: monthKey(todayBR()), sources: b.sources })
        .returning();
      res.status(201).json(g);
    }),
  );

  app.post(
    "/api/goals/:id/contributions",
    auth,
    requirePlan("metas"),
    wrap(async (req, res) => {
      const { amount } = contributionInput.parse(req.body);
      const result = await recordGoalContribution(db(), req.user!, req.params.id, amount);
      res.status(201).json(result);
    }),
  );

  app.patch(
    "/api/goals/:id",
    auth,
    requirePlan("metas_grupo"),
    wrap(async (req, res) => {
      const b = z.object({ splitMode: z.enum(["igual", "prop"]).optional(), myPrivacy: z.enum(["contrib", "cats"]).optional() }).parse(req.body);
      const g = await owned<S.Goal>(S.goals, req.params.id, uid(req));
      const [n] = await db()
        .update(S.goals)
        .set({ splitMode: b.splitMode ?? g.splitMode, myPrivacy: b.myPrivacy ?? g.myPrivacy })
        .where(eq(S.goals.id, g.id))
        .returning();
      if (b.myPrivacy) await db().update(S.goalMembers).set({ privacy: b.myPrivacy }).where(and(eq(S.goalMembers.goalId, g.id), eq(S.goalMembers.isMe, true)));
      res.json(n);
    }),
  );

  app.post(
    "/api/goals/:id/invites",
    auth,
    requirePlan("metas_grupo"),
    wrap(async (req, res) => {
      const b = z.object({ contact: z.string().trim().min(5).max(120) }).parse(req.body);
      await owned(S.goals, req.params.id, uid(req));
      const [i] = await db().insert(S.goalInvites).values({ userId: uid(req), goalId: req.params.id, contact: b.contact }).returning();
      res.status(201).json(i);
    }),
  );

  // ---------- Contas ----------
  app.get("/api/openfinance/banks", auth, (_req, res) => res.json(BANKS));

  app.post(
    "/api/openfinance/connect",
    auth,
    wrap(async (req, res) => {
      if (provider.id === "sandbox" && !canUseSandbox(req.user!)) throw new HttpError(503, REAL_OPEN_FINANCE_UNAVAILABLE);
      const b = z.object({ institution: z.string().min(2).max(60), simulation: z.literal(true) }).parse(req.body);
      const current = await db().select().from(S.connections).where(eq(S.connections.userId, uid(req)));
      if (current.length >= 1 && !hasFeature(req.user!.plan as PlanId, "multi_open_finance")) throw new HttpError(402, "No plano Grátis, 1 conta via Open Finance. A importação de arquivos é ilimitada.");
      if (current.some((c) => c.institution === b.institution)) throw new HttpError(409, `${b.institution} já está conectado.`);
      const r = await provider.connect(uid(req), b.institution);
      res.status(201).json(r);
    }),
  );

  app.post(
    "/api/connections/:id/sync",
    auth,
    wrap(async (req, res) => {
      const connection = await owned<S.Connection>(S.connections, req.params.id, uid(req));
      if (connection.provider === "sandbox" && !canUseSandbox(req.user!)) throw new HttpError(503, REAL_OPEN_FINANCE_UNAVAILABLE);
      res.json(await provider.sync(uid(req), req.params.id));
    }),
  );

  app.post(
    "/api/connections/:id/renew",
    auth,
    wrap(async (req, res) => {
      const connection = await owned<S.Connection>(S.connections, req.params.id, uid(req));
      if (connection.provider === "sandbox" && !canUseSandbox(req.user!)) throw new HttpError(503, REAL_OPEN_FINANCE_UNAVAILABLE);
      const t = todayBR();
      const [c] = await db()
        .update(S.connections)
        .set({ consentExpiresAt: new Date(t.getFullYear() + 1, t.getMonth(), t.getDate()) })
        .where(eq(S.connections.id, req.params.id))
        .returning();
      res.json(c);
    }),
  );

  app.delete(
    "/api/connections/:id",
    auth,
    wrap(async (req, res) => {
      const connection = await owned<S.Connection>(S.connections, req.params.id, uid(req));
      if (connection.provider !== "sandbox") throw new HttpError(503, "É necessário configurar a revogação no provedor antes de desconectar uma conta real.");
      const removed = await disconnectSandboxConnection(db(), uid(req), connection.id);
      if (!removed) throw new HttpError(404, "Conexão não encontrada.");
      res.json({ ok: true, historyPreserved: true, simulated: true });
    }),
  );

  app.post(
    "/api/imports",
    auth,
    wrap(async (req, res) => {
      const b = z.object({ files: z.array(z.object({ name: z.string().min(1).max(200), content: z.string().max(14_000_000), encoding: z.enum(["text", "base64"]).optional(), mime: z.string().optional(), accountId: z.string().optional() })).min(1).max(12) }).parse(req.body);
      const results = [];
      for (const f of b.files) results.push(await importFile(uid(req), f));
      res.json({ results });
    }),
  );

  app.post(
    "/api/imports/sample",
    auth,
    wrap(async (req, res) => {
      const results = [];
      for (const f of sampleFiles(todayBR())) results.push(await importFile(uid(req), f));
      res.json({ results });
    }),
  );

  app.post(
    "/api/accounts/:id/entries",
    auth,
    requirePlan("contas_manuais"),
    wrap(async (req, res) => {
      const b = z.object({ description: z.string().trim().min(1).max(120), amount: money }).parse(req.body);
      const a = await owned<S.Account>(S.accounts, req.params.id, uid(req));
      const { categorize } = await import("@shared/engine");
      const rules = await db().select().from(S.categoryRules).where(eq(S.categoryRules.userId, uid(req)));
      const [t] = await db()
        .insert(S.transactions)
        .values({ userId: uid(req), accountId: a.id, description: b.description, amount: b.amount, categoryId: categorize(b.description, rules).categoryId, date: monthKeyDay(), fingerprint: `manual-${nanoid(12)}` })
        .returning();
      res.status(201).json(t);
    }),
  );

  app.post(
    "/api/accounts/:id/statement",
    auth,
    requirePlan("contas_manuais"),
    wrap(async (req, res) => {
      const b = z.object({ name: z.string().min(1).max(200), content: z.string().max(14_000_000), mime: z.string().optional() }).parse(req.body);
      await owned(S.accounts, req.params.id, uid(req));
      const r = await importFile(uid(req), { name: b.name, content: b.content, encoding: "base64", mime: b.mime, accountId: req.params.id });
      res.json(r);
    }),
  );

  app.post(
    "/api/personal-debts/:id/payments",
    auth,
    requirePlan("dividas_pessoais"),
    wrap(async (req, res) => {
      const b = z.object({ amount: money, method: z.string().max(40).optional() }).parse(req.body);
      await owned(S.personalDebts, req.params.id, uid(req));
      const [p] = await db().insert(S.personalDebtPayments).values({ userId: uid(req), debtId: req.params.id, date: monthKeyDay(), amount: b.amount, method: b.method || "Registrado agora" }).returning();
      res.status(201).json(p);
    }),
  );

  app.patch(
    "/api/category-rules/:id",
    auth,
    wrap(async (req, res) => {
      const b = z.object({ enabled: z.boolean() }).parse(req.body);
      await owned(S.categoryRules, req.params.id, uid(req));
      const [n] = await db().update(S.categoryRules).set({ enabled: b.enabled }).where(eq(S.categoryRules.id, req.params.id)).returning();
      res.json(n);
    }),
  );

  // ---------- Assistente ----------
  app.get(
    "/api/assistant/messages",
    auth,
    wrap(async (req, res) => res.json(await history(uid(req)))),
  );

  app.post(
    "/api/assistant/messages",
    auth,
    wrap(async (req, res) => {
      const b = z
        .object({
          text: z.string().max(1000).optional(),
          audio: z.object({ base64: z.string().max(14_000_000), mime: z.string(), seconds: z.number().optional() }).optional(),
          photo: z.object({ base64: z.string().max(14_000_000), mime: z.string() }).optional(),
        })
        .refine((x) => x.text?.trim() || x.audio || x.photo, "Mensagem vazia.")
        .parse(req.body);
      res.json(await handleMessage(uid(req), b));
    }),
  );

  app.post(
    "/api/assistant/actions",
    auth,
    wrap(async (req, res) => {
      const b = z.object({ messageId: z.string(), action: z.enum(["confirm", "category", "plan"]), payload: z.record(z.unknown()).optional() }).parse(req.body);
      res.json(await handleAction(uid(req), b.messageId, b.action, b.payload));
    }),
  );

  // ---------- WhatsApp ----------
  app.post(
    "/api/whatsapp/link",
    auth,
    requirePlan("whatsapp"),
    wrap(async (req, res) => {
      const b = z.object({ phone: z.string().min(8).max(20) }).parse(req.body);
      try {
        res.json(await startLink(uid(req), b.phone));
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
    }),
  );

  app.post(
    "/api/whatsapp/verify",
    auth,
    requirePlan("whatsapp"),
    wrap(async (req, res) => {
      const b = z.object({ code: z.string().min(6).max(6) }).parse(req.body);
      try {
        const l = await verifyLink(uid(req), b.code);
        res.json({ ...l, codeHash: undefined });
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
    }),
  );

  app.patch(
    "/api/whatsapp",
    auth,
    wrap(async (req, res) => {
      const b = z.object({ alerts: z.object({ teto: z.boolean(), venc: z.boolean(), sem: z.boolean(), ext: z.boolean() }) }).parse(req.body);
      const l = await getLink(uid(req));
      if (!l) await db().insert(S.whatsappLinks).values({ userId: uid(req), alerts: b.alerts });
      else await db().update(S.whatsappLinks).set({ alerts: b.alerts }).where(eq(S.whatsappLinks.userId, uid(req)));
      res.json({ ok: true });
    }),
  );

  app.delete(
    "/api/whatsapp",
    auth,
    wrap(async (req, res) => {
      await db().update(S.whatsappLinks).set({ status: "off", phone: null, codeHash: null }).where(eq(S.whatsappLinks.userId, uid(req)));
      res.json({ ok: true });
    }),
  );

  app.get("/api/whatsapp/webhook", (req, res) => {
    if (VERIFY_TOKEN && req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === VERIFY_TOKEN) return res.send(String(req.query["hub.challenge"] || ""));
    res.sendStatus(403);
  });

  app.post("/api/whatsapp/webhook", (req, res) => {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (secret) {
      const sig = String(req.headers["x-hub-signature-256"] || "");
      const raw = (req as Request & { rawBody?: Buffer }).rawBody || Buffer.from("");
      const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
      if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return res.sendStatus(401);
    }
    res.sendStatus(200);
    void onIncoming(req.body).catch(() => {});
  });
}

function monthKeyDay(): string {
  const t = todayBR();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
