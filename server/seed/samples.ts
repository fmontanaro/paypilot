// Arquivos de exemplo ("Usar arquivos de exemplo" no onboarding): OFX e CSV reais, gerados a partir
// da persona dos últimos 3 meses fechados. Passam pelo mesmo leitor que os arquivos do usuário.
import { buildPersona } from "@shared/demo/persona";
import { monthShort } from "@shared/format";
import type { Transaction } from "@shared/schema";
import type { UploadFile } from "../ingestion";

const ofxDate = (d: string) => d.replace(/-/g, "") + "120000[-3:BRT]";
const brDate = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const brNum = (v: number) => v.toFixed(2).replace(".", ",");

export function sampleFiles(today: Date): UploadFile[] {
  const r = buildPersona(today, "s");
  const start = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().slice(0, 10);
  const end = new Date(today.getFullYear(), today.getMonth(), 0);
  const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  const inRange = (t: Transaction) => t.date >= start && t.date <= endIso;
  const of = (acc: string) => r.transactions.filter((t) => t.accountId === `s_${acc}` && inRange(t));
  const m3 = monthShort(today.getMonth() - 3);
  const m1 = monthShort(today.getMonth() - 1);

  const ofxBody = of("conta_itau")
    .map((t, i) => `<STMTTRN><TRNTYPE>${t.amount > 0 ? "DEBIT" : "CREDIT"}<DTPOSTED>${ofxDate(t.date)}<TRNAMT>${(-t.amount).toFixed(2)}<FITID>ITAU${i}${t.date.replace(/-/g, "")}<MEMO>${t.description}\n</STMTTRN>`)
    .join("\n");
  const ofx = `OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n<OFX><SIGNONMSGSRSV1><SONRS><FI><ORG>Itau Unibanco</ORG></FI></SONRS></SIGNONMSGSRSV1><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>\n${ofxBody}\n</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>\n`;

  const nubank = "date,title,amount\n" + of("nubank").map((t) => `${t.date},${t.description.replace(/,/g, " ")},${t.amount.toFixed(2)}`).join("\n") + "\n";
  const xp = "Data;Estabelecimento;Valor\n" + of("xp").map((t) => `${brDate(t.date)};${t.description};${brNum(t.amount)}`).join("\n") + "\n";
  const santander = "Data;Histórico;Valor\n" + [...of("santander"), ...of("conta_santander")].sort((a, b) => a.date.localeCompare(b.date)).map((t) => `${brDate(t.date)};${t.description};${brNum(-t.amount)}`).join("\n") + "\n";

  return [
    { name: `extrato_itau_${m3}-${m1}.ofx`, content: ofx },
    { name: `fatura_nubank_${m1}.csv`, content: nubank },
    { name: `fatura_xp_${m1}.csv`, content: xp },
    { name: `extrato_santander_${m3}-${m1}.csv`, content: santander },
  ];
}
