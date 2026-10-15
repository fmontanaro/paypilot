// Provedor de IA. Só interpreta pedidos, transcreve áudio e lê linhas de PDF/foto.
// Nenhum valor exibido ao usuário é calculado aqui: os números vêm do motor financeiro.
// Sem OPENAI_API_KEY, `available` é false e o assistente usa só o interpretador por regras.
import type { ParsedTx } from "../ingestion/parsers";
import type { Intent } from "./intents";

export interface AIProvider {
  available: boolean;
  interpret(text: string): Promise<Intent | null>;
  transcribe(base64: string, mime: string): Promise<string>;
  readStatement(base64: string, mime: string): Promise<ParsedTx[]>;
}

const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

const INTENT_PROMPT = `Você interpreta mensagens em português para o PayPilot, um app de finanças pessoais.
Responda só JSON: {"intent": "...", "amount": número|null, "description": texto|null, "category": texto|null}.
intents: registrar_gasto, consultar_teto, posso_gastar, vencimentos, resumo_mes, plano, fora_do_escopo.
category, quando houver: moradia, mercado, restaurantes, transporte, assinaturas, compras, saude, lazer, empresa.
Se a mensagem não for sobre as finanças do próprio usuário, use fora_do_escopo. Nunca calcule nada.`;

function unavailable(): AIProvider {
  return {
    available: false,
    interpret: async () => null,
    transcribe: async () => {
      throw new Error("Transcrição indisponível");
    },
    readStatement: async () => {
      throw new Error("Leitura indisponível");
    },
  };
}

function openaiProvider(apiKey: string): AIProvider {
  let clientP: Promise<import("openai").default> | null = null;
  const client = () => (clientP ??= import("openai").then((m) => new m.default({ apiKey, baseURL: process.env.OPENAI_BASE_URL })));
  return {
    available: true,
    async interpret(text) {
      try {
        const c = await client();
        const r = await c.chat.completions.create({ model: MODEL, temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "system", content: INTENT_PROMPT }, { role: "user", content: text }] });
        const j = JSON.parse(r.choices[0]?.message?.content || "{}");
        return j.intent ? (j as Intent) : null;
      } catch {
        return null;
      }
    },
    async transcribe(base64, mime) {
      const c = await client();
      const { toFile } = await import("openai");
      const file = await toFile(Buffer.from(base64, "base64"), `audio.${mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm"}`, { type: mime });
      const r = await c.audio.transcriptions.create({ file, model: process.env.AI_TRANSCRIBE_MODEL || "whisper-1", language: "pt" });
      return r.text;
    },
    async readStatement(base64, mime) {
      const c = await client();
      const content: unknown[] = [{ type: "text", text: 'Extraia as transações deste extrato ou fatura. Responda só JSON: {"transactions":[{"date":"aaaa-mm-dd","description":"...","amount":número}]}. amount positivo para compra ou saída, negativo para entrada ou pagamento. Não some nem calcule nada.' }];
      if (mime === "application/pdf") content.push({ type: "file", file: { filename: "documento.pdf", file_data: `data:${mime};base64,${base64}` } });
      else content.push({ type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } });
      const r = await c.chat.completions.create({ model: MODEL, temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "user", content: content as never }] });
      const j = JSON.parse(r.choices[0]?.message?.content || "{}");
      return (j.transactions || []).filter((t: ParsedTx) => /^\d{4}-\d{2}-\d{2}$/.test(t.date) && Number.isFinite(t.amount));
    },
  };
}

export const ai: AIProvider = process.env.OPENAI_API_KEY ? openaiProvider(process.env.OPENAI_API_KEY) : unavailable();
