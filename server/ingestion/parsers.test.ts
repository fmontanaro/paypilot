import { describe, expect, it } from "vitest";
import { detectFormat, parseCSV, parseOFX } from "./parsers";

const OFX = `OFXHEADER:100
DATA:OFXSGML
<OFX><SIGNONMSGSRSV1><SONRS><FI><ORG>Banco Itau</ORG></FI></SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261005120000[-3:BRT]<TRNAMT>-7800.00<FITID>A1<MEMO>Aluguel Imobiliaria Lopes
</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261005<TRNAMT>30000.00<FITID>A2<NAME>SALARIO
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

describe("leitor OFX", () => {
  it("lê transações, inverte o sinal e reconhece o banco", () => {
    const f = parseOFX(OFX, "extrato.ofx");
    expect(f.institution).toBe("Itaú");
    expect(f.kind).toBe("conta");
    expect(f.transactions).toEqual([
      { date: "2026-10-05", description: "Aluguel Imobiliaria Lopes", amount: 7800, externalId: "A1" },
      { date: "2026-10-05", description: "SALARIO", amount: -30000, externalId: "A2" },
    ]);
  });
});

describe("leitor CSV", () => {
  it("lê extrato com ; e valores em reais (saída negativa)", () => {
    const f = parseCSV("Data;Descrição;Valor\n05/10/2026;Aluguel;-7.800,00\n05/10/2026;Salário;30.000,00\n06/10/2026;iFood;-86,40\n", "extrato_santander_out.csv");
    expect(f.institution).toBe("Santander");
    expect(f.kind).toBe("conta");
    expect(f.transactions.map((t) => t.amount)).toEqual([7800, -30000, 86.4]);
  });
  it("lê fatura no formato do Nubank (compra positiva)", () => {
    const f = parseCSV("date,title,amount\n2026-10-01,Uber *Trip,38.90\n2026-10-02,Pagamento recebido,-500.00\n2026-10-03,Spotify,21.90\n", "nubank-2026-10.csv");
    expect(f.kind).toBe("cartao");
    expect(f.institution).toBe("Nubank");
    expect(f.transactions.map((t) => t.amount)).toEqual([38.9, -500, 21.9]);
  });
  it("aceita colunas de débito e crédito separadas", () => {
    const f = parseCSV("Data,Histórico,Débito,Crédito\n10/10/2026,Tarifa cesta,64.90,\n10/10/2026,Pix recebido,,1000.00\n", "itau.csv");
    expect(f.transactions.map((t) => t.amount)).toEqual([64.9, -1000]);
  });
});

describe("detecção de formato", () => {
  it("reconhece pela extensão e pelo conteúdo", () => {
    expect(detectFormat("a.OFX", "")).toBe("ofx");
    expect(detectFormat("a.txt", "<OFX>")).toBe("ofx");
    expect(detectFormat("fatura.pdf", "")).toBe("pdf");
    expect(detectFormat("foto.jpg", "")).toBe("imagem");
    expect(detectFormat("planilha.xlsx", "")).toBeNull();
  });
});
