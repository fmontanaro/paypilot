// Assistente: entende o pedido (regras e, se ligada, IA), chama o motor e responde com texto ou card.
// Responde só sobre as finanças do usuário (política do WhatsApp) e nunca indica investimento.
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as S from "@shared/schema";
import { CATEGORY_BY_ID, category } from "@shared/categories";
import { affordability, buildContext, categorize, daysBetween, totalSpent, upcoming, type Context } from "@shared/engine";
import { brl, daysInMonth, dayMonth, isoDate, monthLong, monthYear } from "@shared/format";
import { FREE_CHAT_LIMIT } from "@shared/plans";
import { db } from "../db";
import { loadAppData } from "../storage";
import { ai } from "./llm";
import { ruleIntent, type Intent } from "./intents";

export type Card =
  | { type: "expense"; kicker: string; title: string; v: number; cat: string; meta: string; accountId: string | null; date: string; status: "pending" | "done"; txId?: string }
  | { type: "teto"; kicker: string; title: string; spent: number; limit: number; pace: number; text: string; budgetId: string }
  | { type: "afford"; kicker: string; title: string; rows: { k: string; v: string; tone: "warn" | "muted" }[]; text: string; safe: number; amount: number; category: string }
  | { type: "venc"; kicker: string; title: string; list: { d: string; n: string; v: number }[] };

type Reply = { kind: "text"; text: string } | { kind: "card"; card: Card };

export class ChatLimitError extends Error {}

function defaultCard(ctx: Context): S.Account | null {
  const cards = ctx.data.accounts.filter((a) => a.kind === "cartao");
  if (!cards.length) return ctx.data.accounts[0] ?? null;
  const since = isoDate(new Date(ctx.today.getFullYear(), ctx.today.getMonth(), ctx.today.getDate() - 30));
  const count = (id: string) => ctx.data.transactions.filter((t) => t.accountId === id && t.date >= since && t.kind === "gasto").length;
  return [...cards].sort((a, b) => count(b.id) - count(a.id))[0];
}

function expenseCard(ctx: Context, intent: Intent, kicker = "Registrar este gasto?"): Card {
  const rules = ctx.data.rules;
  const what = intent.description || "Gasto";
  const cat = intent.category && CATEGORY_BY_ID[intent.category] ? intent.category : categorize(what, rules).categoryId;
  const acc = defaultCard(ctx);
  return { type: "expense", kicker, title: what, v: intent.amount || 0, cat, meta: `Hoje · ${acc ? ctx.accountShort(acc.id) : "Manual"}`, accountId: acc?.id ?? null, date: ctx.data.today, status: "pending" };
}

function reply(ctx: Context, intent: Intent): Reply[] {
  const { today } = ctx;
  const dim = daysInMonth(today);
  const first = (ctx.data.user.name || "").split(" ")[0];
  switch (intent.intent) {
    case "registrar_gasto":
      return [{ kind: "card", card: expenseCard(ctx, intent) }];
    case "consultar_teto": {
      const list = ctx.ceilings;
      if (!list.length) return [{ kind: "text", text: "Você ainda não tem tetos. Em Gastos › Tetos dá para criar um em um passo." }];
      const c = (intent.category && list.find((x) => x.categoryId === intent.category)) || [...list].sort((a, b) => b.pct - a.pct)[0];
      const left = c.limit - c.spent;
      const proj = c.projection;
      const text = proj > c.limit ? `No ritmo atual, o mês fecha em ${brl(proj)}. Que tal segurar os gastos de ${c.label} até o dia ${dim}?` : `No ritmo atual, o mês fecha em ${brl(proj)}, dentro do teto.`;
      return [{ kind: "card", card: { type: "teto", kicker: `Teto de ${c.label}`, title: left >= 0 ? `Restam ${brl(left)} até o dia ${dim}` : `Passou ${brl(-left)} do teto`, spent: c.spent, limit: c.limit, pace: c.expectedPace, text, budgetId: c.id } }];
    }
    case "posso_gastar": {
      const amount = intent.amount || 0;
      if (!amount) return [{ kind: "text", text: "Quanto você quer gastar? Por exemplo: “posso gastar R$ 600 num jantar sábado?”" }];
      const catId = intent.category || "lazer";
      const ceil = ctx.ceilings.find((c) => c.categoryId === catId) || null;
      const a = affordability(amount, ctx.summary.diff, ceil, ctx.payoff);
      const rows: { k: string; v: string; tone: "warn" | "muted" }[] = [];
      rows.push(a.diffBefore < 0 ? { k: "Falta no mês", v: `${brl(-a.diffBefore)} → ${brl(Math.max(0, -a.diffAfter))}`, tone: "muted" } : { k: "Sobra no mês", v: `${brl(a.diffBefore)} → ${brl(a.diffAfter)}`, tone: a.diffAfter < 0 ? "warn" : "muted" });
      if (a.ceiling) rows.push({ k: `Teto de ${a.ceiling.label.toLowerCase()}`, v: a.ceiling.overflow > 0 ? `estoura ${brl(a.ceiling.overflow)}` : "dentro do teto", tone: a.ceiling.overflow > 0 ? "warn" : "muted" });
      if (a.topDebtName && a.payoffDelayDays > 0) rows.push({ k: `Quitação do ${a.topDebtName.replace(/^Rotativo .*/, "rotativo")}`, v: `+${a.payoffDelayDays} dias`, tone: "muted" });
      const safe = a.ceiling ? a.ceiling.safe : 0;
      const title = a.fits ? "Cabe" : a.ceiling && a.ceiling.overflow > 0 && safe > 0 ? "Cabe, mas aperta" : a.ceiling && safe === 0 ? "Melhor esperar" : "Aperta o mês";
      const text = a.ceiling && a.ceiling.overflow > 0 && safe > 0 ? `Com até ${brl(safe)} fica dentro do teto e não mexe no plano.` : a.fits ? "Fica dentro do teto e do mês." : "Se puder, deixe para depois que o mês fechar.";
      return [{ kind: "card", card: { type: "afford", kicker: "Impacto no mês", title, rows, text, safe, amount, category: catId } }];
    }
    case "vencimentos": {
      const list = upcoming(ctx, 7).filter((u) => u.amount > 0);
      if (!list.length) return [{ kind: "text", text: "Nada vence nos próximos 7 dias." }];
      const total = list.reduce((s, u) => s + u.amount, 0);
      return [{ kind: "card", card: { type: "venc", kicker: "Próximos 7 dias", title: `${brl(total)} em ${list.length} conta${list.length > 1 ? "s" : ""}`, list: list.map((u) => ({ d: daysBetween(today, u.date) === 0 ? "Hoje" : dayMonth(u.date), n: u.name, v: u.amount })) } }];
    }
    case "plano": {
      const ph = ctx.phases.find((p) => p.current)!;
      const free = ctx.payoff.debtFree;
      return [{ kind: "text", text: `Você está na fase ${ph.n} de 4 · ${ph.label}. Dívida total de ${brl(ctx.payoff.totalDebt)}${free ? `, com quitação prevista para ${monthYear(free)}` : ""}. Quer ver o plano de quitação?` }];
    }
    case "resumo_mes": {
      const spent = totalSpent(ctx.data.transactions, today);
      const mes = monthLong(today.getMonth());
      const tail = ctx.summary.fits ? `Pelo plano, sobram ${brl(ctx.summary.diff)} em ${mes}.` : `Faltam ${brl(-ctx.summary.diff)} para fechar o mês — quer ver as formas de cobrir?`;
      return [{ kind: "text", text: `Até hoje você gastou ${brl(spent)} em ${mes}. ${tail}` }];
    }
    case "investimento":
      return [{ kind: "text", text: "Não indico investimentos: o destino da sua sobra é decisão sua. Posso mostrar quanto sobra por mês no seu plano." }];
    case "saudacao":
      return [{ kind: "text", text: `Oi${first ? `, ${first}` : ""}! Me conte um gasto, mande um áudio ou a foto de uma nota. Também respondo sobre o seu mês e o seu plano.` }];
    default:
      return [{ kind: "text", text: "Eu só consigo ajudar com as suas finanças no PayPilot. Pode perguntar sobre gastos, contas, tetos e o seu plano." }];
  }
}

async function interpret(text: string): Promise<Intent> {
  const r = ruleIntent(text);
  if (r.intent !== "fora_do_escopo" || !ai.available) return r;
  return (await ai.interpret(text)) || r;
}

async function save(userId: string, channel: string, msgs: Omit<S.ChatMessage, "id" | "userId" | "createdAt" | "channel">[]) {
  if (!msgs.length) return [];
  return db()
    .insert(S.chatMessages)
    .values(msgs.map((m, i) => ({ ...m, userId, channel, createdAt: new Date(Date.now() + i) })))
    .returning();
}

export interface Incoming {
  text?: string;
  audio?: { base64: string; mime: string; seconds?: number };
  photo?: { base64: string; mime: string };
}

export async function handleMessage(userId: string, input: Incoming, channel: "app" | "whatsapp" = "app"): Promise<S.ChatMessage[]> {
  const data = await loadAppData(userId);
  if (data.user.plan === "gratis" && data.chatCount >= FREE_CHAT_LIMIT) throw new ChatLimitError(`No plano Grátis são ${FREE_CHAT_LIMIT} mensagens por mês. No Plus o assistente não tem limite.`);
  const ctx = buildContext(data);
  const out: Omit<S.ChatMessage, "id" | "userId" | "createdAt" | "channel">[] = [];
  let text = input.text?.trim() || "";

  if (input.audio) {
    if (!ai.available) {
      out.push({ role: "me", kind: "audio", text: null, card: { dur: `0:${String(Math.max(1, input.audio.seconds || 3)).padStart(2, "0")}` } });
      out.push({ role: "pp", kind: "text", text: "Ainda não consigo ouvir áudios: o leitor com IA não está ligado. Escreva o gasto, por exemplo “gastei 48 no almoço”.", card: null });
      return save(userId, channel, out);
    }
    text = await ai.transcribe(input.audio.base64, input.audio.mime).catch(() => "");
    out.push({ role: "me", kind: "audio", text: text || null, card: { dur: `0:${String(Math.max(1, input.audio.seconds || 3)).padStart(2, "0")}` } });
    if (!text) {
      out.push({ role: "pp", kind: "text", text: "Não entendi o áudio. Pode repetir ou escrever?", card: null });
      return save(userId, channel, out);
    }
  } else if (input.photo) {
    out.push({ role: "me", kind: "photo", text: null, card: null });
    if (!ai.available) {
      out.push({ role: "pp", kind: "text", text: "Ainda não consigo ler fotos: o leitor com IA não está ligado. Me conte o gasto por texto.", card: null });
      return save(userId, channel, out);
    }
    const rows = await ai.readStatement(input.photo.base64, input.photo.mime).catch(() => []);
    const r = rows.find((x) => x.amount > 0);
    if (!r) out.push({ role: "pp", kind: "text", text: "Não consegui ler a nota. Tente uma foto mais nítida ou me conte o gasto.", card: null });
    else out.push({ role: "pp", kind: "card", text: null, card: { ...expenseCard(ctx, { intent: "registrar_gasto", amount: r.amount, description: `${r.description} · nota fiscal lida` }, "Li a sua nota"), date: r.date } });
    return save(userId, channel, out);
  } else {
    out.push({ role: "me", kind: "text", text, card: null });
  }

  const intent = await interpret(text);
  for (const r of reply(ctx, intent)) out.push(r.kind === "text" ? { role: "pp", kind: "text", text: r.text, card: null } : { role: "pp", kind: "card", text: null, card: r.card as unknown as Record<string, unknown> });
  return save(userId, channel, out);
}

/** Ações dos cards: confirmar gasto, mudar categoria, planejar valor seguro. */
export async function handleAction(userId: string, messageId: string, action: string, payload: Record<string, unknown> = {}): Promise<S.ChatMessage[]> {
  const d = db();
  const [msg] = await d
    .select()
    .from(S.chatMessages)
    .where(and(eq(S.chatMessages.id, messageId), eq(S.chatMessages.userId, userId)));
  if (!msg || msg.kind !== "card" || !msg.card) throw new Error("Mensagem não encontrada");
  const card = msg.card as unknown as Card;
  if (card.type === "expense" && action === "confirm" && card.status === "pending") {
    const [t] = await d
      .insert(S.transactions)
      .values({ userId, accountId: card.accountId, date: card.date, description: card.title, amount: card.v, kind: "gasto", categoryId: card.cat, fingerprint: `chat-${nanoid(12)}` })
      .returning();
    const next = { ...card, status: "done", kicker: "Gasto registrado", txId: t.id };
    const [m] = await d.update(S.chatMessages).set({ card: next as unknown as Record<string, unknown> }).where(eq(S.chatMessages.id, msg.id)).returning();
    return [m];
  }
  if (card.type === "expense" && action === "category" && typeof payload.cat === "string" && CATEGORY_BY_ID[payload.cat]) {
    const next = { ...card, cat: payload.cat };
    if (card.txId) await d.update(S.transactions).set({ categoryId: payload.cat }).where(and(eq(S.transactions.id, card.txId), eq(S.transactions.userId, userId)));
    const [m] = await d.update(S.chatMessages).set({ card: next as unknown as Record<string, unknown> }).where(eq(S.chatMessages.id, msg.id)).returning();
    return [m];
  }
  if (card.type === "afford" && action === "plan") {
    const c = category(card.category);
    return save(userId, msg.channel, [{ role: "pp", kind: "text", text: `Combinado: com até ${brl(card.safe)} fica dentro do teto de ${c.name.toLowerCase()}. Quando você registrar o gasto, eu confiro de novo.`, card: null }]);
  }
  return [msg];
}

export async function history(userId: string, limit = 80) {
  const rows = await db().select().from(S.chatMessages).where(eq(S.chatMessages.userId, userId)).orderBy(desc(S.chatMessages.createdAt)).limit(limit);
  return rows.reverse();
}
