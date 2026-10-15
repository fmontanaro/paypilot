// Leitores de extrato e fatura. Convenção do PayPilot: saída positiva, entrada negativa.
import { parseMoney } from "@shared/format";

export interface ParsedTx {
  date: string; // yyyy-mm-dd
  description: string;
  amount: number;
  externalId?: string;
}

export interface ParsedFile {
  institution: string | null;
  kind: "conta" | "cartao";
  transactions: ParsedTx[];
}

const INSTITUTIONS: [RegExp, string][] = [
  [/nubank|nu pagamentos|\bnu\b/i, "Nubank"],
  [/ita[uú]|personnalit/i, "Itaú"],
  [/santander/i, "Santander"],
  [/\bxp\b|xp investimentos|banco xp/i, "XP"],
  [/bradesco/i, "Bradesco"],
  [/banco do brasil|\bbb\b/i, "Banco do Brasil"],
  [/caixa|cef/i, "Caixa"],
  [/\binter\b|banco inter/i, "Inter"],
  [/\bc6\b|c6 bank/i, "C6 Bank"],
];

export function guessInstitution(...hints: (string | null | undefined)[]): string | null {
  const h = hints.filter(Boolean).join(" ").replace(/[_\-.]+/g, " ");
  for (const [re, name] of INSTITUTIONS) if (re.test(h)) return name;
  return null;
}

export function guessKind(fileName: string, content = ""): "conta" | "cartao" {
  return /fatura|cart[aã]o|credit|card/i.test(fileName) || /<CREDITCARDMSGSRSV1>/i.test(content) ? "cartao" : "conta";
}

function ofxDate(s: string): string {
  const m = s.match(/(\d{4})(\d{2})(\d{2})/);
  if (!m) throw new Error("Data inválida no OFX");
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : null;
}

/** OFX 1.x (SGML) e 2.x (XML): lê cada <STMTTRN>. */
export function parseOFX(content: string, fileName = ""): ParsedFile {
  const blocks = content.split(/<STMTTRN>/i).slice(1);
  const transactions: ParsedTx[] = [];
  for (const raw of blocks) {
    const b = raw.split(/<\/STMTTRN>/i)[0];
    const dt = tag(b, "DTPOSTED");
    const amt = tag(b, "TRNAMT");
    if (!dt || !amt) continue;
    const desc = tag(b, "MEMO") || tag(b, "NAME") || "Lançamento";
    const name = tag(b, "NAME");
    const value = parseFloat(amt.replace(",", "."));
    transactions.push({ date: ofxDate(dt), description: name && desc !== name && !desc.includes(name) ? `${name} ${desc}`.trim() : desc, amount: -value, externalId: tag(b, "FITID") || undefined });
  }
  const org = tag(content, "ORG");
  return { institution: guessInstitution(org, fileName), kind: guessKind(fileName, content), transactions };
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === sep && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function csvDate(s: string): string | null {
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

/**
 * CSV de banco ou cartão. Detecta separador, colunas de data, descrição e valor
 * (ou débito/crédito separados). Em fatura, compra vem positiva; em extrato, saída vem negativa.
 */
export function parseCSV(content: string, fileName = ""): ParsedFile {
  const lines = content.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { institution: guessInstitution(fileName), kind: guessKind(fileName), transactions: [] };
  const sep = [";", ",", "\t"].sort((a, b) => lines[0].split(b).length - lines[0].split(a).length)[0];
  const header = splitCsvLine(lines[0], sep).map((h) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const find = (re: RegExp) => header.findIndex((h) => re.test(h));
  let iDate = find(/^data|date|dt/);
  let iDesc = find(/descri|hist|estabelec|lancamento|title|titulo|memo|detalhe/);
  let iVal = find(/^valor|amount|value|quantia/);
  const iDeb = find(/debito|saida/);
  const iCred = find(/credito|entrada/);
  let start = 1;
  if (iDate < 0) {
    // Sem cabeçalho: data, descrição, valor.
    iDate = 0;
    iDesc = 1;
    iVal = 2;
    start = 0;
  }
  const rows: { date: string; description: string; raw: number }[] = [];
  for (const line of lines.slice(start)) {
    const cols = splitCsvLine(line, sep);
    const date = csvDate(cols[iDate] || "");
    if (!date) continue;
    let raw: number;
    if (iVal >= 0) raw = parseMoney(cols[iVal] || "0");
    else raw = parseMoney(cols[iCred] || "0") - parseMoney(cols[iDeb] || "0");
    if (iVal < 0 && iDeb >= 0 && !cols[iCred] && cols[iDeb]) raw = -Math.abs(parseMoney(cols[iDeb]));
    const description = (cols[iDesc] || "Lançamento").replace(/\s+/g, " ").trim();
    if (!raw) continue;
    rows.push({ date, description, raw });
  }
  const kind = guessKind(fileName, header.join(" "));
  const positives = rows.filter((r) => r.raw > 0).length;
  // Fatura: a maioria dos valores é positiva (compras) → saída = valor. Extrato: saída já vem negativa.
  const cardStyle = kind === "cartao" || positives > rows.length * 0.6;
  return {
    institution: guessInstitution(fileName),
    kind: cardStyle ? "cartao" : "conta",
    transactions: rows.map((r) => ({ date: r.date, description: r.description, amount: cardStyle ? r.raw : -r.raw })),
  };
}

export function detectFormat(fileName: string, content: string): "ofx" | "csv" | "pdf" | "imagem" | null {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  if (ext === "ofx" || /<OFX>/i.test(content.slice(0, 2000))) return "ofx";
  if (ext === "csv" || ext === "txt") return "csv";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "heic", "webp"].includes(ext)) return "imagem";
  return null;
}
