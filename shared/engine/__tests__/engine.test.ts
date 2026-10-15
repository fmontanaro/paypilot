import { describe, expect, it } from "vitest";
import { buildPersona } from "../../demo/persona";
import { isoDate } from "../../format";
import type { PublicUser } from "../../schema";
import {
  actions,
  affordability,
  buildContext,
  categorize,
  categoryRows,
  ceilings,
  detectLeaks,
  goalCalc,
  groupShares,
  impact,
  installmentCost,
  makeAccountLabel,
  moneySources,
  payoffPlan,
  pmt,
  renegotiate,
  rolloverHistory,
  routes,
  suggestions,
  summarize,
  upcoming,
  withSection,
  type AppData,
} from "..";

const TODAY = new Date(2026, 9, 15);

function appData(today = TODAY): AppData {
  const r = buildPersona(today, "u");
  const user: PublicUser = { id: "u", email: "marcos@demo", phone: null, name: "Marcos Ribeiro", plan: "pilot", prefs: { theme: "claro", biometric: true, notifications: { teto: true, venc: true, sem: true, ext: true }, importReminder: true, debtBudget: r.debtBudget }, isDemo: true, onboardedAt: today, createdAt: today };
  return {
    today: isoDate(today),
    user,
    incomes: r.incomes,
    connections: r.connections,
    accounts: r.accounts,
    imports: r.imports,
    transactions: r.transactions,
    splits: [],
    rules: r.rules,
    budgets: r.budgets,
    subscriptions: r.subscriptions,
    leaks: r.leaks,
    commitments: r.commitments,
    decisions: {},
    rolloverChoices: [],
    snapshots: [],
    personalDebts: r.personalDebts,
    personalDebtPayments: r.personalDebtPayments,
    groups: r.groups,
    obligations: r.obligations,
    goals: r.goals,
    goalMembers: r.goalMembers,
    goalInvites: [],
    whatsapp: null,
    chatCount: 0,
  };
}

describe("matemática financeira", () => {
  it("calcula a parcela pela tabela Price", () => {
    expect(pmt(1000, 0, 4)).toBe(250);
    expect(pmt(8900, 3.2, 6)).toBeCloseTo(1653.8, 0);
    expect(installmentCost(8900, 3.2, 6)).toBeCloseTo(1022.9, 0);
  });
});

describe("motor de priorização (persona do handoff)", () => {
  const ctx = buildContext(appData());

  it("soma R$ 46.500 previstos e mostra que faltam R$ 8.400 com as escolhas padrão", () => {
    expect(ctx.income).toBe(34000);
    expect(ctx.summary.planned).toBe(46500);
    expect(ctx.summary.monthTotal).toBe(42400);
    expect(ctx.summary.diff).toBe(-8400);
    expect(ctx.summary.fits).toBe(false);
    expect(ctx.summary.covered).toBe(4100);
  });

  it("libera só as seções permitidas para cada item", () => {
    const byName = (n: string) => ctx.items.find((i) => i.name === n)!;
    expect(byName("Aluguel").allowed).toEqual([]);
    expect(byName("Aluguel").paid).toBe(true);
    expect(byName("Fatura Itaú").allowed).toEqual(["pagar", "parcelar", "negociar"]);
    expect(byName("Mercado").allowed).toEqual(["pagar"]);
    expect(byName("Lazer e passeios").section).toBe("cortar");
  });

  it("sugere primeiro o adiamento sem custo e depois os parcelamentos mais baratos", () => {
    const s = suggestions(ctx.items, ctx.today);
    expect(s.map((x) => x.id)).toEqual(["u_com_helena", "u_com_fat_xp", "u_com_fat_itau"]);
    expect(s[0].title).toBe("Combinar com a Helena para novembro");
    expect(s[0].cost).toBe(0);
    expect(s[2].title).toBe("Parcelar a fatura Itaú em 6x");
  });

  it("recalcula o mês ao mover itens: com as 3 sugestões, outubro cabe", () => {
    let items = ctx.items;
    for (const sug of suggestions(items, ctx.today)) items = withSection(items, sug.id, sug.to);
    const sum = summarize(items, ctx.income);
    expect(sum.fits).toBe(true);
    expect(sum.diff).toBeGreaterThan(3000);
    expect(sum.cost).toBeGreaterThan(1000);
  });

  it("não aceita mover para seção proibida", () => {
    const items = withSection(ctx.items, "u_com_mercado", "cortar");
    expect(items.find((i) => i.id === "u_com_mercado")!.section).toBe("pagar");
  });

  it("parcelar coloca só a parcela no mês", () => {
    const itau = ctx.items.find((i) => i.name === "Fatura Itaú")!;
    expect(impact(itau, "parcelar")).toBeCloseTo(1653.8, 0);
    expect(impact(itau, "negociar")).toBe(0);
  });
});

describe("tetos e ritmo", () => {
  it("projeta o gasto até o fim do mês e marca o ritmo esperado", () => {
    const d = appData();
    const list = ceilings(d.budgets, d.transactions, TODAY);
    const uber = list.find((c) => c.label === "Uber")!;
    expect(uber.spent).toBeCloseTo(990, 2);
    expect(uber.status).toBe("limite");
    expect(uber.projection).toBeCloseTo(2046, 0);
    expect(uber.expectedPace).toBeCloseTo(15 / 31, 4);
    const rest = list.find((c) => c.label === "Restaurantes")!;
    expect(rest.spent).toBeCloseTo(1380, 2);
  });
});

describe("Início", () => {
  const ctx = buildContext(appData());
  it("mostra no máximo 3 ações, começando pelo que vence hoje", () => {
    const a = actions(ctx);
    expect(a).toHaveLength(3);
    expect(a[0].title).toBe("Fatura Santander vence hoje");
    expect(a[1].title).toBe("Você pode economizar R$ 480/mês cancelando 4 assinaturas");
    expect(a[2].title).toBe("Teto de Uber em 99% e ainda é dia 15");
  });
  it("lista vencimentos e fechamentos dos próximos 14 dias", () => {
    const u = upcoming(ctx);
    expect(u[0].name).toBe("Fatura Santander");
    expect(u[0].tag).toBe("Vence hoje");
    const xp = u.find((x) => x.name === "Fechamento do cartão XP")!;
    expect(xp.tag).toBe("Compras depois daqui vão para dezembro");
    expect(u.some((x) => x.name === "Lazer e passeios")).toBe(false);
  });
});

describe("categorização", () => {
  it("usa o dicionário padrão", () => {
    expect(categorize("Uber *Trip").categoryId).toBe("transporte");
    expect(categorize("IFOOD *RESTAURANTE").categoryId).toBe("restaurantes");
    expect(categorize("DARF parcelamento").categoryId).toBe("empresa");
    expect(categorize("Uber One").categoryId).toBe("assinaturas");
    expect(categorize("Algo desconhecido").categoryId).toBe("compras");
  });
  it("aplica as regras do usuário antes do dicionário", () => {
    const rule = { id: "r", userId: "u", pattern: "Uber", categoryId: "empresa", groupId: "g", label: null, enabled: true, createdAt: new Date() };
    expect(categorize("Uber *Trip", [rule])).toEqual({ categoryId: "empresa", groupId: "g", ruleId: "r" });
  });
});

describe("gastos por categoria", () => {
  it("compara com o mesmo período do mês anterior e respeita filtros", () => {
    const d = appData();
    const rows = categoryRows(d.transactions, TODAY, 34000, { type: "todos", accountId: "todas", groupId: "todos" });
    expect(rows[0].id).toBe("moradia");
    expect(rows.find((r) => r.id === "juros")!.value).toBeCloseTo(2140, 2);
    const sup = categoryRows(d.transactions, TODAY, 34000, { type: "superfluo", accountId: "todas", groupId: "todos" });
    expect(sup.every((r) => !r.essential)).toBe(true);
    const emp = categoryRows(d.transactions, TODAY, 34000, { type: "todos", accountId: "todas", groupId: "u_grp_empresa" });
    expect(emp.map((r) => r.id)).toEqual(["empresa"]);
  });
});

describe("caçador de vazamentos", () => {
  it("acha serviço de música repetido, aumento de preço, tarifa, seguro e duplicidade", () => {
    const d = appData();
    const { label } = makeAccountLabel(d.accounts);
    const found = detectLeaks(d.transactions, d.subscriptions, label, TODAY);
    const keys = found.map((f) => f.key);
    expect(keys).toContain("sub:deezer");
    expect(found.find((f) => f.key === "sub:deezer")!.reason).toMatch(/Spotify/);
    expect(keys).toContain("sub:clube de vinhos");
    expect(keys.some((k) => k.startsWith("tar:"))).toBe(true);
    expect(keys.some((k) => k.startsWith("seg:"))).toBe(true);
    expect(found.filter((f) => f.kind === "dup")).toHaveLength(1);
  });
});

describe("otimizador de rolagem", () => {
  const d = appData();
  const itau = d.commitments.find((c) => c.name === "Fatura Itaú")!;
  const r = routes(itau, d.accounts, d.incomes, TODAY);
  it("compara parcelar, outro cartão e cheque especial", () => {
    expect(r.map((x) => x.kind)).toEqual(["parcelar", "outro_cartao", "cheque"]);
    expect(r[1].name).toBe("Pagar com o limite do cartão XP");
    expect(r[1].days).toBe(36);
    expect(r[1].cost).toBe(0);
  });
  it("só a rota com saída recebe o selo de mais barata", () => {
    expect(r.filter((x) => x.best).map((x) => x.kind)).toEqual(["parcelar"]);
  });
  it("lê o custo da rolagem dos últimos 6 meses", () => {
    const h = rolloverHistory(d.transactions, TODAY);
    expect(h.map((x) => Math.round(x.cost))).toEqual([3420, 3180, 2960, 2880, 2610, 2140]);
  });
});

describe("plano de quitação", () => {
  const ctx = buildContext(appData());
  it("ataca da mais cara para a mais barata e termina antes de pagar só o mínimo", () => {
    expect(ctx.debts).toHaveLength(4);
    expect(ctx.payoff.totalDebt).toBe(54700);
    expect(ctx.payoff.debts.map((x) => x.name)).toEqual(["Rotativo Nubank", "Cheque especial Itaú", "Empréstimo Santander", "Empréstimo do Paulo (irmão)"]);
    const [rot, cheque] = ctx.payoff.debts;
    expect(rot.payoffIndex).toBeLessThanOrEqual(cheque.payoffIndex + 2);
    expect(ctx.payoff.savingsVsMin).toBeGreaterThan(0);
    expect(ctx.payoff.debtFree).not.toBeNull();
  });
  it("começa na fase 1 enquanto o mês não cabe", () => {
    expect(ctx.phase).toBe(1);
    expect(ctx.phases[0].current).toBe(true);
  });
  it("tirar dinheiro para uma meta atrasa a quitação", () => {
    const base = payoffPlan(ctx.debts, TODAY, 5500);
    const less = payoffPlan(ctx.debts, TODAY, 5500, { amount: 1500, months: 6 });
    expect(less.debts[0].payoffIndex).toBeGreaterThanOrEqual(base.debts[0].payoffIndex);
  });
});

describe("renegociação", () => {
  it("sugere faixa à vista e compara antes × depois", () => {
    const ctx = buildContext(appData());
    const rot = ctx.debts.find((x) => x.kind === "rotativo")!;
    const r = renegotiate(rot, 12)!;
    expect(r.range).toEqual([7400, 8600]);
    expect(r.newInstallment).toBeCloseTo(pmt(12300, 2.9, 12), 6);
    expect(r.before.term).toBe("Sem fim definido");
    expect(r.script).toContain("R$ 7.400");
  });
});

describe("metas", () => {
  it("propõe fontes e calcula cobertura", () => {
    const d = appData();
    const src = moneySources(d.leaks, d.budgets);
    expect(src[0].key).toBe("sub");
    expect(src[0].amount).toBeCloseTo(480, 2);
    expect(src.find((s) => s.title.includes("restaurantes"))!.amount).toBe(300);
    expect(src.find((s) => s.title.includes("compras"))!.amount).toBe(200);
    const ctx = buildContext(d);
    const calc = goalCalc(6000, 6, src.slice(0, 2), ctx.debts, 5500, TODAY);
    expect(calc.monthly).toBe(1000);
    expect(calc.covered).toBeCloseTo(780, 2);
    expect(calc.gap).toBeCloseTo(220, 2);
  });
  it("divide meta em grupo igual ou proporcional à renda", () => {
    const d = appData();
    const igual = groupShares(d.goalMembers, 2000, "igual");
    expect(igual.map((x) => x.share)).toEqual([1000, 1000]);
    const prop = groupShares(d.goalMembers, 2000, "prop");
    expect(Math.round(prop[0].pct * 100)).toBe(65);
  });
});

describe("posso gastar?", () => {
  it("mostra impacto no mês, no teto e no plano", () => {
    const ctx = buildContext(appData());
    const rest = ctx.ceilings.find((c) => c.categoryId === "restaurantes")!;
    const a = affordability(600, ctx.summary.diff, rest, ctx.payoff);
    expect(a.diffAfter).toBe(-9000);
    expect(a.ceiling!.overflow).toBeCloseTo(180, 2);
    expect(a.ceiling!.safe).toBeCloseTo(420, 2);
    expect(a.fits).toBe(false);
    expect(a.payoffDelayDays).toBeGreaterThan(0);
  });
});
