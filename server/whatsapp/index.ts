// Assistente no WhatsApp (WhatsApp Business Platform, Cloud API da Meta).
// Desde 15/01/2026 a Meta só permite assistentes ligados ao serviço da empresa: o PayPilot
// responde só sobre as finanças do usuário. Desligar o WhatsApp não tira nenhuma função do app.
import crypto from "crypto";
import { eq } from "drizzle-orm";
import * as S from "@shared/schema";
import { brl } from "@shared/format";
import { db } from "../db";
import { handleMessage } from "../assistant";
import { log } from "../log";

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
export const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";
export const whatsappConfigured = !!(TOKEN && PHONE_ID);

const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
export const normalizePhone = (p: string) => p.replace(/\D/g, "").replace(/^55/, "");

export async function sendText(phone: string, body: string) {
  if (!whatsappConfigured) {
    log(`[whatsapp:dev] para +55 ${phone}: ${body}`, "whatsapp");
    return;
  }
  await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: `55${phone}`, type: "text", text: { body } }),
  });
}

export async function getLink(userId: string) {
  const [l] = await db().select().from(S.whatsappLinks).where(eq(S.whatsappLinks.userId, userId));
  return l ?? null;
}

/** Gera e envia o código de 6 dígitos para o número. */
export async function startLink(userId: string, phoneRaw: string) {
  const phone = normalizePhone(phoneRaw);
  if (phone.length < 10 || phone.length > 11) throw new Error("Confira o número com DDD.");
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await db()
    .insert(S.whatsappLinks)
    .values({ userId, phone, status: "code", codeHash: hash(code) })
    .onConflictDoUpdate({ target: S.whatsappLinks.userId, set: { phone, status: "code", codeHash: hash(code) } });
  await sendText(phone, `Seu código do PayPilot é ${code}. Não compartilhe com ninguém.`);
  return { phone, devCode: whatsappConfigured ? undefined : code };
}

export async function verifyLink(userId: string, code: string) {
  const l = await getLink(userId);
  if (!l || l.status !== "code" || l.codeHash !== hash(code.trim())) throw new Error("Código não confere. Confira a mensagem no WhatsApp.");
  const [u] = await db().update(S.whatsappLinks).set({ status: "on", codeHash: null }).where(eq(S.whatsappLinks.userId, userId)).returning();
  await sendText(l.phone!, "Pronto! Agora é só me mandar seus gastos por aqui, em texto, áudio ou foto da nota.");
  return u;
}

/** Recebe mensagens do webhook e responde com o mesmo assistente do app. */
export async function onIncoming(body: unknown) {
  const entries = (body as { entry?: { changes?: { value?: { messages?: { from: string; type: string; text?: { body: string } }[] } }[] }[] })?.entry || [];
  for (const e of entries)
    for (const ch of e.changes || [])
      for (const m of ch.value?.messages || []) {
        const phone = normalizePhone(m.from);
        const [link] = await db().select().from(S.whatsappLinks).where(eq(S.whatsappLinks.phone, phone));
        if (!link || link.status !== "on") continue;
        if (m.type !== "text" || !m.text?.body) {
          await sendText(phone, "Por aqui eu leio texto por enquanto. Áudio e foto ficam disponíveis quando o leitor com IA estiver ligado.");
          continue;
        }
        const out = await handleMessage(link.userId, { text: m.text.body }, "whatsapp").catch((err: Error) => [{ kind: "text", text: err.message, card: null, role: "pp" }] as unknown as S.ChatMessage[]);
        for (const r of out.filter((x) => x.role === "pp")) await sendText(phone, toPlain(r));
      }
}

/** Cards ricos viram texto simples no WhatsApp. */
function toPlain(m: S.ChatMessage): string {
  if (m.kind !== "card" || !m.card) return m.text || "";
  const c = m.card as Record<string, unknown>;
  if (c.type === "expense") return `${c.kicker}\n${c.title}: ${brl(Number(c.v), true)}\nResponda "ok" no app para confirmar.`;
  if (c.type === "teto") return `${c.kicker}: ${c.title}\n${c.text}`;
  if (c.type === "afford") return `${c.title}\n${(c.rows as { k: string; v: string }[]).map((r) => `${r.k}: ${r.v}`).join("\n")}\n${c.text}`;
  if (c.type === "venc") return `${c.title}\n${(c.list as { d: string; n: string; v: number }[]).map((v) => `${v.d} · ${v.n}: ${brl(v.v)}`).join("\n")}`;
  return String(c.title || "");
}
