// Persona de demonstração do handoff: Marcos, 38 anos, renda R$ 34.000, compromissos de R$ 46.500.
// Datas relativas a `today`, para a demo funcionar em qualquer mês. Usada pelo seed e pelos testes.
import type {
  Account,
  Budget,
  CategoryRule,
  Commitment,
  Connection,
  ExpenseGroup,
  Goal,
  GoalMember,
  GroupObligation,
  ImportRow,
  Income,
  Leak,
  PersonalDebt,
  PersonalDebtPayment,
  Subscription,
  Transaction,
} from "../schema";
import { isoDate, monthKey } from "../format";

export interface PersonaRows {
  incomes: Income[];
  connections: Connection[];
  accounts: Account[];
  imports: ImportRow[];
  transactions: Transaction[];
  rules: CategoryRule[];
  budgets: Budget[];
  subscriptions: Subscription[];
  leaks: Leak[];
  commitments: Commitment[];
  personalDebts: PersonalDebt[];
  personalDebtPayments: PersonalDebtPayment[];
  groups: ExpenseGroup[];
  obligations: GroupObligation[];
  goals: Goal[];
  goalMembers: GoalMember[];
  /** Dívida total e quitação prevista do mês anterior (o seed calcula a partir do plano atual). */
  previousDebtExtra: number;
  debtBudget: number;
}

const ACC = {
  nubank: "nubank",
  itau: "itau",
  santander: "santander",
  xp: "xp",
  contaItau: "conta_itau",
  contaSantander: "conta_santander",
  cheque: "cheque_itau",
  emprestimo: "emprestimo_santander",
  helena: "cartao_helena",
} as const;
type AccKey = keyof typeof ACC;

export function buildPersona(today: Date, uid: string): PersonaRows {
  const p = (s: string) => `${uid}_${s}`;
  const now = new Date(today);
  const created = new Date(today.getFullYear(), today.getMonth() - 4, 1);
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = today.getDate();
  const ym = (offset: number, d: number) => {
    const last = new Date(y, m - offset + 1, 0).getDate();
    return isoDate(new Date(y, m - offset, Math.min(d, last)));
  };
  /** Dia do mês atual `ago` dias atrás, sem sair do mês. */
  const ago = (n: number) => isoDate(new Date(y, m, Math.max(1, day - n)));
  const userId = uid;

  const incomes: Income[] = [
    { id: p("inc1"), userId, name: "Salário", amount: 30000, payDay: 5, recurring: true, createdAt: created },
    { id: p("inc2"), userId, name: "Consultorias", amount: 4000, payDay: 10, recurring: true, createdAt: created },
  ];

  const inDays = (n: number) => new Date(y, m, day + n, 12);
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const connections: Connection[] = [
    { id: p("con_nubank"), userId, provider: "sandbox", institution: "Nubank", itemsLabel: "Conta + cartão", status: "ok", lastSyncAt: hoursAgo(0.2), lastError: null, consentExpiresAt: new Date(y, m + 6, 14), externalId: null, createdAt: created },
    { id: p("con_itau"), userId, provider: "sandbox", institution: "Itaú", itemsLabel: "2 contas + 2 cartões", status: "ok", lastSyncAt: hoursAgo(1), lastError: null, consentExpiresAt: new Date(y, m + 3, 2), externalId: null, createdAt: created },
    { id: p("con_santander"), userId, provider: "sandbox", institution: "Santander", itemsLabel: "Cartão + empréstimo", status: "ok", lastSyncAt: hoursAgo(3), lastError: null, consentExpiresAt: inDays(6), externalId: null, createdAt: created },
    { id: p("con_xp"), userId, provider: "sandbox", institution: "XP", itemsLabel: "Cartão Visa Infinite", status: "erro", lastSyncAt: hoursAgo(30), lastError: "Não conseguimos atualizar desde ontem", consentExpiresAt: new Date(y, m + 7, 30), externalId: null, createdAt: created },
  ];

  const acc = (key: AccKey, a: Partial<Account> & Pick<Account, "institution" | "name" | "kind">): Account => ({
    id: p(ACC[key]),
    userId,
    connectionId: null,
    source: "open_finance",
    creditLimit: null,
    used: null,
    debtBalance: null,
    closingDay: null,
    dueDay: null,
    monthlyRate: null,
    installmentRate: null,
    installmentAmount: null,
    installmentsLeft: null,
    ownerName: null,
    label: null,
    createdAt: created,
    ...a,
  });
  const accounts: Account[] = [
    acc("nubank", { institution: "Nubank", name: "Nubank", kind: "cartao", connectionId: p("con_nubank"), creditLimit: 18000, used: 16900, debtBalance: 12300, closingDay: 3, dueDay: 10, monthlyRate: 14.5, installmentRate: 3.9, label: "Nubank" }),
    acc("itau", { institution: "Itaú", name: "Itaú Personnalité", kind: "cartao", connectionId: p("con_itau"), creditLimit: 25000, used: 14200, closingDay: 20, dueDay: 27, monthlyRate: 13.9, installmentRate: 3.2, label: "Itaú" }),
    acc("santander", { institution: "Santander", name: "Santander", kind: "cartao", connectionId: p("con_santander"), creditLimit: 12000, used: 6800, closingDay: 8, dueDay: 15, monthlyRate: 15.2, installmentRate: 4.3, label: "Santander" }),
    acc("xp", { institution: "XP", name: "XP Visa Infinite", kind: "cartao", connectionId: p("con_xp"), creditLimit: 20000, used: 9100, closingDay: 25, dueDay: 2, monthlyRate: 12.8, installmentRate: 3.4, label: "XP" }),
    acc("contaItau", { institution: "Itaú", name: "Conta Itaú", kind: "conta", connectionId: p("con_itau") }),
    acc("contaSantander", { institution: "Santander", name: "Conta Santander", kind: "conta", source: "arquivo" }),
    acc("cheque", { institution: "Itaú", name: "Cheque especial Itaú", kind: "cheque_especial", connectionId: p("con_itau"), creditLimit: 12000, used: 2400, debtBalance: 2400, monthlyRate: 8 }),
    acc("emprestimo", { institution: "Santander", name: "Empréstimo Santander", kind: "emprestimo", connectionId: p("con_santander"), creditLimit: 28000, used: 28000, debtBalance: 28000, dueDay: 17, monthlyRate: 3.9, installmentAmount: 1690, installmentsLeft: 24 }),
    acc("helena", { institution: "Cartão da Helena", name: "Cartão da Helena (mãe)", kind: "cartao_manual", source: "manual", creditLimit: 6000, closingDay: 12, dueDay: 19, ownerName: "Helena", label: "Cartão da Helena" }),
  ];

  const imports: ImportRow[] = [
    { id: p("imp1"), userId, fileName: `fatura_helena_${monthKey(new Date(y, m - 1, 1)).slice(5)}.jpg`, format: "jpg", status: "lido", txCount: 23, periodStart: ym(1, 1), periodEnd: ym(1, 30), message: "Foto da fatura", createdAt: new Date(y, m - 1, 20) },
    { id: p("imp2"), userId, fileName: "extrato_santander_mes1.csv", format: "csv", status: "lido", txCount: 96, periodStart: ym(1, 1), periodEnd: ym(1, 30), message: null, createdAt: new Date(y, m, 5) },
    { id: p("imp3"), userId, fileName: "extrato_santander_mes2.csv", format: "csv", status: "lido", txCount: 102, periodStart: ym(2, 1), periodEnd: ym(2, 30), message: null, createdAt: new Date(y, m - 1, 4) },
    { id: p("imp4"), userId, fileName: "extrato_itau_3meses.ofx", format: "ofx", status: "lido", txCount: 214, periodStart: ym(3, 1), periodEnd: ym(1, 30), message: "Enviado no cadastro", createdAt: created },
    { id: p("imp5"), userId, fileName: "fatura_xp_mes1.pdf", format: "pdf", status: "lido", txCount: 58, periodStart: ym(1, 1), periodEnd: ym(1, 30), message: "Enviado no cadastro", createdAt: created },
  ];
  // Nomes de arquivo com o mês real, como o usuário enviaria.
  const mname = (o: number) => ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][((m - o) % 12 + 12) % 12];
  imports[1].fileName = `extrato_santander_${mname(1)}.csv`;
  imports[2].fileName = `extrato_santander_${mname(2)}.csv`;
  imports[3].fileName = `extrato_itau_${mname(3)}-${mname(1)}.ofx`;
  imports[4].fileName = `fatura_xp_${mname(1)}.pdf`;
  imports[0].fileName = `fatura_helena_${mname(1)}.jpg`;

  // ---------- Transações ----------
  const transactions: Transaction[] = [];
  let seq = 0;
  const tx = (date: string, description: string, categoryId: string, account: AccKey | null, amount: number, extra: Partial<Transaction> = {}) => {
    seq++;
    transactions.push({
      id: p(`tx${seq}`),
      userId,
      accountId: account ? p(ACC[account]) : null,
      importId: null,
      date,
      description,
      amount,
      kind: "gasto",
      categoryId,
      groupId: null,
      notes: null,
      flag: null,
      fingerprint: `${uid}-${seq}`,
      createdAt: new Date(new Date(date + "T12:00:00").getTime() + seq * 1000),
      ...extra,
    });
  };

  const SUBS: [string, string, number, AccKey, number][] = [
    ["Netflix", "N", 20.9, "nubank", 3],
    ["Spotify", "Sp", 21.9, "nubank", 1],
    ["Amazon Prime", "AP", 19.9, "itau", 6],
    ["Disney+", "D+", 27.9, "itau", 8],
    ["iCloud+", "iC", 14.9, "nubank", 9],
    ["Google One", "G1", 9.9, "xp", 4],
    ["Uber One", "U1", 16.6, "nubank", 11],
    ["Deezer", "Dz", 22.9, "itau", 1],
    ["Smart Fit Black", "SF", 149.9, "santander", 7],
    ["Clube de vinhos", "CV", 219.9, "xp", 5],
    ["Globoplay + canais", "Gp", 87.3, "nubank", 12],
  ];
  const ROLL = [3420, 3180, 2960, 2880, 2610, 2140]; // custo da rolagem, 5 meses atrás → mês atual

  // Meses anteriores (5 a 1): fixos, assinaturas, juros e variáveis.
  for (let o = 5; o >= 1; o--) {
    const f = 1 + ((o * 7) % 5) / 20 - 0.08; // variação determinística por mês
    tx(ym(o, 5), "Salário", "transferencia", "contaItau", -30000, { kind: "entrada" });
    tx(ym(o, 10), "Consultorias · nota fiscal", "transferencia", "contaItau", -4000, { kind: "entrada" });
    tx(ym(o, 5), "Aluguel · Imobiliária Lopes", "moradia", "contaItau", 7800);
    tx(ym(o, 20), "Condomínio Ed. Aurora", "moradia", "contaItau", 1450);
    tx(ym(o, 28), "Enel · luz, água e gás", "moradia", "contaItau", 648);
    tx(ym(o, 18), "Escola Viva · mensalidade", "educacao", "contaItau", 4200);
    tx(ym(o, 22), "Bradesco Saúde · plano", "saude", "contaItau", 2650);
    tx(ym(o, 20), `DARF · parcelamento ${18 - o}/48`, "empresa", "contaItau", 890, { groupId: p("grp_empresa") });
    tx(ym(o, 10), "Pix para Contabilidade Exata", "empresa", "contaItau", 450, { groupId: p("grp_empresa") });
    tx(ym(o, 17), "Empréstimo Santander · parcela", "transferencia", "contaSantander", 1690, { kind: "transferencia" });
    for (const [name, , amount, a, d] of SUBS) {
      if (name === "Globoplay + canais" && o >= 1) continue; // teste grátis até o mês passado
      const price = name === "Clube de vinhos" && o >= 2 ? 186.35 : amount;
      tx(ym(o, d), name, "assinaturas", a, price);
    }
    const roll = ROLL[5 - o];
    tx(ym(o, 10), "Juros rotativo Nubank", "juros", "nubank", Math.round((roll - 168.8) * 100) / 100);
    tx(ym(o, 3), "Tarifa cesta de serviços", "juros", "contaItau", 64.9, { flag: "fee" });
    tx(ym(o, 8), "Anuidade Santander", "juros", "santander", 42);
    tx(ym(o, 25), "Seguro perda e roubo", "juros", "xp", 12.9);
    tx(ym(o, 2), "IOF rotativo", "juros", "nubank", 49);
    // Variáveis (mesmos dias do mês atual, valores ajustados).
    const V: [number, string, string, AccKey, number][] = [
      [2, "Uber *Trip", "transporte", "nubank", 52.3], [4, "Uber *Trip", "transporte", "nubank", 61.2], [6, "Uber *Trip", "transporte", "nubank", 58.9], [8, "Uber *Trip", "transporte", "nubank", 72.5], [10, "Uber *Trip", "transporte", "nubank", 55.3], [12, "Uber *Trip", "transporte", "nubank", 76.1],
      [3, "Posto Shell", "transporte", "santander", 287.4], [14, "Uber *Trip", "transporte", "nubank", 38.9],
      [1, "Pão de Açúcar", "mercado", "xp", 286.4], [3, "Hortifruti", "mercado", "xp", 142.3], [7, "Carrefour", "mercado", "xp", 312.7], [11, "St Marche", "mercado", "xp", 165], [13, "Assaí Atacadista", "mercado", "xp", 833.6], [24, "Pão de Açúcar", "mercado", "xp", 412.2],
      [2, "Outback", "restaurantes", "itau", 412], [3, "Coco Bambu", "restaurantes", "itau", 268.5], [5, "iFood", "restaurantes", "itau", 74.9], [9, "Sushi Leblon", "restaurantes", "itau", 286], [11, "iFood", "restaurantes", "itau", 92.4], [13, "Burger King", "restaurantes", "nubank", 56.6], [19, "iFood", "restaurantes", "itau", 118.4],
      [4, "Amazon Marketplace", "compras", "itau", 389.9], [7, "Renner", "compras", "itau", 659.8], [10, "Kalunga", "compras", "xp", 120.3], [21, "Magazine Luiza", "compras", "itau", 310],
      [2, "Drogasil", "saude", "santander", 64.8], [6, "Droga Raia", "saude", "santander", 98.8], [9, "Laboratório Fleury", "saude", "santander", 80], [16, "Drogasil", "saude", "santander", 172.4],
      [15, "Cinema Kinoplex", "lazer", "nubank", 128], [23, "Parque Ibirapuera · estacionamento", "lazer", "nubank", 40],
    ];
    for (const [d, desc, cat, a, v] of V) tx(ym(o, d), desc, cat, a, Math.round(v * f * 100) / 100);
  }

  // Mês atual (só até hoje).
  if (day >= 5) tx(ym(0, 5), "Salário", "transferencia", "contaItau", -30000, { kind: "entrada" });
  if (day >= 10) tx(ym(0, 10), "Consultorias · nota fiscal", "transferencia", "contaItau", -4000, { kind: "entrada" });
  tx(ago(Math.max(0, day - 5)), "Aluguel · Imobiliária Lopes", "moradia", "contaItau", 7800);
  tx(ago(Math.max(0, day - 10)), "Pix para Contabilidade Exata", "empresa", "contaItau", 450, { groupId: p("grp_empresa") });
  tx(ago(2), "DARF · parcelamento 18/48", "empresa", "contaItau", 890, { groupId: p("grp_empresa") });
  for (const [name, , amount, a, d] of SUBS) tx(ago(Math.max(0, day - Math.min(d, day))), name, "assinaturas", a, amount, name === "Spotify" || name === "Deezer" ? { flag: "music", date: ago(1) } : {});
  tx(ago(Math.max(0, day - 10)), "Juros rotativo Nubank", "juros", "nubank", 1779.1);
  tx(ago(Math.max(0, day - 2)), "IOF rotativo", "juros", "nubank", 49.1);
  tx(ago(Math.max(0, day - 1)), "Juros cheque especial", "juros", "contaItau", 192);
  tx(ago(2), "Tarifa cesta de serviços", "juros", "contaItau", 64.9, { flag: "fee" });
  tx(ago(Math.max(0, day - 8)), "Anuidade Santander", "juros", "santander", 42);
  tx(ago(Math.max(0, day - 9)), "Seguro perda e roubo", "juros", "xp", 12.9);
  const CUR: [number, string, string, AccKey, number, string?][] = [
    [0, "Uber *Trip", "transporte", "nubank", 38.9], [0, "Suco Natural Casa", "restaurantes", "nubank", 12.9], [0, "iFood", "restaurantes", "itau", 86.4],
    [1, "Pão de Açúcar", "mercado", "xp", 286.4], [1, "Posto Shell", "transporte", "santander", 287.4, "dup"], [1, "Posto Shell", "transporte", "santander", 287.4, "dup"],
    [2, "Uber *Trip", "transporte", "nubank", 52.3], [2, "Drogasil", "saude", "santander", 64.8], [2, "Outback", "restaurantes", "itau", 412],
    [3, "Hortifruti", "mercado", "xp", 142.3], [3, "Coco Bambu", "restaurantes", "itau", 268.5], [4, "Uber *Trip", "transporte", "nubank", 61.2], [4, "Amazon Marketplace", "compras", "itau", 389.9],
    [5, "iFood", "restaurantes", "itau", 74.9], [6, "Uber *Trip", "transporte", "nubank", 58.9], [6, "Padaria Bella Paulista", "restaurantes", "nubank", 58.3], [6, "Droga Raia", "saude", "santander", 98.8],
    [7, "Carrefour", "mercado", "xp", 312.7], [7, "Renner", "compras", "itau", 459.8], [8, "Uber *Trip", "transporte", "nubank", 72.5], [8, "Starbucks", "restaurantes", "nubank", 32],
    [9, "Sushi Leblon", "restaurantes", "itau", 286], [9, "Laboratório Fleury", "saude", "santander", 80], [10, "Uber *Trip", "transporte", "nubank", 55.3], [10, "Kalunga", "compras", "xp", 120.3],
    [11, "St Marche", "mercado", "xp", 165], [11, "iFood", "restaurantes", "itau", 92.4], [12, "Uber *Trip", "transporte", "nubank", 76.1], [12, "Magazine Luiza", "compras", "itau", 150], [13, "Burger King", "restaurantes", "nubank", 56.6],
  ];
  for (const [n, desc, cat, a, v, flag] of CUR) tx(ago(n), desc, cat, a, v, flag ? { flag } : {});
  // Cartão da Helena: gastos lançados no ciclo atual e o Pix que pagou a fatura anterior.
  tx(ago(Math.max(0, day - 11)), "Farmácia São Paulo", "saude", "helena", 186.4);
  tx(ago(Math.max(0, day - 6)), "Leroy Merlin", "moradia", "helena", 1420);
  tx(ago(Math.max(0, day - 2)), "Assaí Atacadista", "mercado", "helena", 733.6);
  tx(ym(1, 19), "Pix para Helena Ribeiro", "transferencia", "contaItau", 2340, { kind: "pagamento_fatura" });
  // Pagamentos ao Paulo (dívida pessoal).
  for (const o of [3, 2, 1]) tx(ym(o, 15), "Pix para Paulo Ribeiro", "transferencia", "contaItau", 1000, { kind: "transferencia" });


  const rules: CategoryRule[] = [
    { id: p("rule1"), userId, pattern: "contabilidade exata", categoryId: "empresa", groupId: p("grp_empresa"), label: "Pix para “Contabilidade Exata”", enabled: true, createdAt: created },
    { id: p("rule2"), userId, pattern: "darf", categoryId: "empresa", groupId: p("grp_empresa"), label: "DARF ou Simples Nacional", enabled: true, createdAt: created },
    { id: p("rule3"), userId, pattern: "software", categoryId: "empresa", groupId: p("grp_empresa"), label: "Cartão XP, compras de “Software”", enabled: true, createdAt: created },
  ];

  const budget = (k: string, categoryId: string, label: string, monthlyLimit: number): Budget => ({ id: p(`bud_${k}`), userId, categoryId, label, monthlyLimit, createdAt: created });
  const budgets: Budget[] = [budget("uber", "transporte", "Uber", 1000), budget("rest", "restaurantes", "Restaurantes", 1800), budget("merc", "mercado", "Mercado", 3000), budget("comp", "compras", "Compras", 1500), budget("assi", "assinaturas", "Assinaturas", 650)];

  const SIGNALS: Record<string, [string, string]> = {
    Deezer: ["No Android: você não abre o Deezer há 47 dias", "phone_android"],
    "Smart Fit Black": [`Último check-in na academia: 12 de ${["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][((m - 2) % 12 + 12) % 12]}`, "fitness_center"],
    Netflix: ["Usado nesta semana no app da TV", "tv"],
    "Globoplay + canais": ["Teste grátis virou cobrança em 1º deste mês", "event"],
    "Disney+": ["No Android: aberto há 3 dias", "phone_android"],
    "Clube de vinhos": ["O preço subiu 18% no mês passado", "trending_up"],
  };
  const label = (a: AccKey) => accounts.find((x) => x.id === p(ACC[a]))!.label || accounts.find((x) => x.id === p(ACC[a]))!.name;
  const subscriptions: Subscription[] = SUBS.map(([name, mono, amount, a], i) => ({ id: p(`sub${i}`), userId, name, monogram: mono, amount, accountLabel: label(a), signal: SIGNALS[name]?.[0] ?? null, signalIcon: SIGNALS[name]?.[1] ?? null, checkin: null, checkinMonth: null, createdAt: created }));
  const order = ["Deezer", "Smart Fit Black", "Netflix", "Globoplay + canais", "Disney+", "Clube de vinhos"];
  subscriptions.sort((a, b) => (order.indexOf(a.name) + 1 || 99) - (order.indexOf(b.name) + 1 || 99));

  const prevMonth = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][((m - 1) % 12 + 12) % 12];
  const leak = (key: string, kind: Leak["kind"], name: string, monogram: string, sourceLabel: string, amount: number, reason: string, cancelWhere: string): Leak => ({ id: p(`leak_${key.replace(/\W/g, "")}`), userId, key, kind, name, monogram, sourceLabel, amount, reason, cancelWhere, status: "aberto", protocol: null, updatedAt: created });
  const leaks: Leak[] = [
    leak("sub:deezer", "sub", "Deezer", "Dz", "Itaú", 22.9, "Serviço de música repetido — você também paga Spotify no Nubank", "o app ou site do Deezer"),
    leak("sub:smart fit black", "sub", "Smart Fit Black", "SF", "Santander", 149.9, `Sem check-in na academia desde ${["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][((m - 2) % 12 + 12) % 12]}`, "o app Smart Fit"),
    leak("sub:clube de vinhos", "sub", "Clube de vinhos", "CV", "XP", 219.9, `O preço subiu 18% em ${prevMonth}`, "o site do clube"),
    leak("sub:globoplay + canais", "sub", "Globoplay + canais", "Gp", "Nubank", 87.3, "Era teste grátis até o fim do mês passado e virou cobrança", "o site do Globoplay"),
    leak("tar:tarifa cesta de servicos", "tar", "Cesta de serviços Itaú", "It", "Conta Itaú", 64.9, "Você usa só serviços que são gratuitos por norma do Banco Central", "o app Itaú"),
    leak("tar:anuidade santander", "tar", "Anuidade Santander", "S", "Cartão Santander", 42, "Cobrada em 12x; dá para pedir isenção", "o app Santander"),
    leak("seg:seguro prestamista", "seg", "Seguro prestamista", "S", "Empréstimo Santander", 38.5, "Embutido na parcela do empréstimo; é opcional", "a central do Santander"),
    leak("seg:seguro perda e roubo", "seg", "Seguro perda e roubo", "XP", "Cartão XP", 12.9, "O cartão já tem proteção do emissor", "o app XP"),
    leak("dup:posto shell", "dup", `Posto Shell · ${new Date(y, m, Math.max(1, day - 1)).getDate()} ${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][m]}`, "Sh", "Cartão Santander", 287.4, "Mesmo valor, mesmo minuto, cobrado 2 vezes", "o app Santander"),
  ];

  let sort = 0;
  const com = (key: string, c: Partial<Commitment> & Pick<Commitment, "name" | "kind" | "amount">): Commitment => ({
    id: p(`com_${key}`),
    userId,
    dueDay: null,
    dueText: null,
    dueNextMonth: false,
    paidMonth: null,
    paidDay: null,
    accountId: null,
    parcelMonths: null,
    delayable: false,
    delayCost: null,
    delayRisk: null,
    delayNote: null,
    counterpart: null,
    cuttable: false,
    defaultSection: null,
    sort: sort++,
    createdAt: created,
    ...c,
  });
  const commitments: Commitment[] = [
    com("aluguel", { name: "Aluguel", kind: "conta", amount: 7800, dueDay: 5, paidMonth: monthKey(today), paidDay: 5 }),
    com("condominio", { name: "Condomínio", kind: "conta", amount: 1450, dueDay: 20, delayable: true, delayRisk: "multa", delayNote: "Multa de 2% e juros" }),
    com("escola", { name: "Escola das crianças", kind: "conta", amount: 4200, dueDay: 18, delayable: true, delayRisk: "multa", delayNote: "Multa de 2%" }),
    com("luz", { name: "Luz, água e gás", kind: "conta", amount: 648, dueDay: 28, delayable: true, delayRisk: "multa", delayNote: "Multa de 2%" }),
    com("saude", { name: "Plano de saúde", kind: "conta", amount: 2650, dueDay: 22, delayable: true, delayRisk: "suspender" }),
    com("mercado", { name: "Mercado", kind: "teto", amount: 3000, dueText: "Teto do mês" }),
    com("emprestimo", { name: "Parcela do empréstimo Santander", kind: "emprestimo", amount: 1690, dueDay: 17, accountId: p(ACC.emprestimo), delayable: true, delayRisk: "negativar", delayNote: "Multa de 2% e pode negativar seu nome" }),
    com("fat_santander", { name: "Fatura Santander", kind: "fatura", amount: 3100, dueDay: 15, accountId: p(ACC.santander), parcelMonths: 4, delayable: true, delayRisk: "negativar" }),
    com("impostos", { name: "Impostos da empresa · 18/48", kind: "imposto", amount: 890, dueDay: 20, delayable: true, delayRisk: "cancelar_parcelamento" }),
    com("fat_itau", { name: "Fatura Itaú", kind: "fatura", amount: 8900, dueDay: 27, accountId: p(ACC.itau), parcelMonths: 6, delayable: true, delayRisk: "rotativo" }),
    com("fat_xp", { name: "Fatura XP", kind: "fatura", amount: 4300, dueDay: 2, dueNextMonth: true, accountId: p(ACC.xp), parcelMonths: 3, delayable: true, delayRisk: "rotativo" }),
    com("helena", { name: "Cartão da Helena (mãe)", kind: "cartao_manual", amount: 2340, dueDay: 19, dueText: "Transferir até {data}", accountId: p(ACC.helena), delayable: true, delayCost: 0, counterpart: "a Helena", delayNote: "Sem juros. Combine com ela." }),
    com("uber", { name: "Uber e transporte", kind: "teto", amount: 1000, dueText: "Teto do mês" }),
    com("seguro_carro", { name: "Seguro do carro", kind: "conta", amount: 300, dueDay: 25, delayable: true, delayCost: 0, delayNote: "Cobertura segue por 30 dias", cuttable: true }),
    com("subs_uso", { name: "Assinaturas em uso (7)", kind: "assinaturas", amount: 132, dueText: "Ao longo do mês", cuttable: true }),
    com("subs_sem", { name: "Assinaturas sem uso (4)", kind: "assinaturas", amount: 480, dueText: "Ao longo do mês", cuttable: true, defaultSection: "cortar" }),
    com("paulo", { name: "Empréstimo do Paulo (irmão)", kind: "divida_pessoal", amount: 1000, dueDay: 30, dueText: "Combinado para {data}", delayable: true, delayCost: 0, counterpart: "o Paulo", delayNote: "Sem juros. Avise o Paulo.", defaultSection: "negociar" }),
    com("contabilidade", { name: "Contabilidade da empresa", kind: "conta", amount: 450, dueDay: 10, dueNextMonth: true, delayable: true, delayCost: 0, delayNote: "Sem multa se avisar antes do dia 20", defaultSection: "negociar" }),
    com("lazer", { name: "Lazer e passeios", kind: "envelope", amount: 2170, dueText: "Ao longo do mês", cuttable: true, defaultSection: "cortar" }),
  ];

  const personalDebts: PersonalDebt[] = [{ id: p("pd_paulo"), userId, creditor: "Paulo", relation: "irmão", principal: 15000, startDate: ym(4, 10), monthlyRate: 0, plannedMonthly: 1000, createdAt: created }];
  const personalDebtPayments: PersonalDebtPayment[] = [3, 2, 1].map((o) => ({ id: p(`pdp${o}`), userId, debtId: p("pd_paulo"), date: ym(o, 15), amount: 1000, method: "Pix", transactionId: null, createdAt: new Date(ym(o, 15)) }));

  const groups: ExpenseGroup[] = [{ id: p("grp_empresa"), userId, name: "Minha empresa", description: "MR Design Ltda · sem faturamento há 7 meses", icon: "business_center", hue: 285, createdAt: created }];
  const obligations: GroupObligation[] = [
    { id: p("ob1"), userId, groupId: p("grp_empresa"), name: "Parcelamento de impostos", amount: 890, detail: "Parcela 18 de 48 · restam 30 · R$ 26.700", installmentsPaid: 18, installmentsTotal: 48 },
    { id: p("ob2"), userId, groupId: p("grp_empresa"), name: "Contabilidade", amount: 450, detail: "Contabilidade Exata · vence dia 10", installmentsPaid: null, installmentsTotal: null },
    { id: p("ob3"), userId, groupId: p("grp_empresa"), name: "Taxas e certificados", amount: 180, detail: "Certificado digital, alvará e domínio (média mensal)", installmentsPaid: null, installmentsTotal: null },
  ];

  const startKey = monthKey(today);
  const monthsToDec = 12 - m; // até dezembro deste ano
  const goals: Goal[] = [
    { id: p("goal_reveillon"), userId, name: "Réveillon na praia", icon: "celebration", target: 5000, saved: 1800, months: Math.max(2, monthsToDec), startMonth: startKey, isGroup: false, splitMode: "prop", myPrivacy: "contrib", sources: [], createdAt: created, historyStartedAt: null },
    { id: p("goal_viagem"), userId, name: "Viagem do casal", icon: "flight", target: 30000, saved: 4500, months: 12, startMonth: monthKey(new Date(y, m - 1, 1)), isGroup: true, splitMode: "prop", myPrivacy: "contrib", sources: [], createdAt: created, historyStartedAt: null },
  ];
  const goalMembers: GoalMember[] = [
    { id: p("gm_marcos"), userId, goalId: p("goal_viagem"), name: "Marcos", isMe: true, income: 34000, saved: 2700, privacy: "contrib" },
    { id: p("gm_ana"), userId, goalId: p("goal_viagem"), name: "Ana", isMe: false, income: 18300, saved: 1800, privacy: "contrib" },
  ];

  return { incomes, connections, accounts, imports, transactions, rules, budgets, subscriptions, leaks, commitments, personalDebts, personalDebtPayments, groups, obligations, goals, goalMembers, previousDebtExtra: 2310, debtBudget: 5500 };
}
