import { sql } from "drizzle-orm";
import { boolean, customType, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

// Valores em reais ficam em numeric(14,2) no banco e viram number no código.
const money = customType<{ data: number; driverData: string }>({
  dataType: () => "numeric(14,2)",
  fromDriver: (v) => Number(v),
  toDriver: (v) => String(v),
});
// Taxas em % ao mês, numeric(7,3).
const rate = customType<{ data: number; driverData: string }>({
  dataType: () => "numeric(7,3)",
  fromDriver: (v) => Number(v),
  toDriver: (v) => String(v),
});

const id = () => varchar("id").primaryKey().default(sql`gen_random_uuid()`);
const userRef = () => varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" });
const createdAt = () => timestamp("created_at").defaultNow().notNull();

export interface UserPrefs {
  theme: "claro" | "escuro" | "sistema";
  biometric: boolean;
  notifications: { teto: boolean; venc: boolean; sem: boolean; ext: boolean };
  importReminder: boolean;
  /** Valor mensal destinado às dívidas no plano de quitação. */
  debtBudget?: number;
}

export const DEFAULT_PREFS: UserPrefs = {
  theme: "claro",
  biometric: true,
  notifications: { teto: true, venc: true, sem: true, ext: true },
  importReminder: true,
};

export const users = pgTable("users", {
  id: id(),
  email: varchar("email").unique(),
  phone: varchar("phone").unique(),
  name: text("name").default(""),
  // Contas antigas criadas por SSO podem não ter senha local.
  passwordHash: text("password_hash"),
  plan: varchar("plan").notNull().default("gratis"),
  prefs: jsonb("prefs").$type<UserPrefs>().notNull().default(DEFAULT_PREFS),
  isDemo: boolean("is_demo").notNull().default(false),
  onboardedAt: timestamp("onboarded_at"),
  createdAt: createdAt(),
});

// Sessões do express-session, guardadas no próprio banco (serve para Postgres e PGlite).
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    userId: varchar("user_id"),
    device: text("device"),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  },
  (t) => [index("sessions_expire_idx").on(t.expire), index("sessions_user_idx").on(t.userId)],
);

export const incomes = pgTable("incomes", {
  id: id(),
  userId: userRef(),
  name: text("name").notNull(),
  amount: money("amount").notNull(),
  payDay: integer("pay_day").notNull().default(5),
  recurring: boolean("recurring").notNull().default(true),
  createdAt: createdAt(),
});

/** Consentimento de Open Finance com uma instituição. */
export const connections = pgTable("connections", {
  id: id(),
  userId: userRef(),
  provider: varchar("provider").notNull().default("sandbox"),
  institution: varchar("institution").notNull(),
  itemsLabel: text("items_label").notNull().default(""),
  status: varchar("status").notNull().default("ok"), // ok | erro | sync
  lastSyncAt: timestamp("last_sync_at").defaultNow().notNull(),
  lastError: text("last_error"),
  consentExpiresAt: timestamp("consent_expires_at").notNull(),
  externalId: varchar("external_id"),
  createdAt: createdAt(),
});

export type AccountKind = "conta" | "cartao" | "cheque_especial" | "emprestimo" | "cartao_manual";

export const accounts = pgTable("accounts", {
  id: id(),
  userId: userRef(),
  connectionId: varchar("connection_id").references(() => connections.id, { onDelete: "set null" }),
  institution: varchar("institution").notNull(),
  name: text("name").notNull(),
  kind: varchar("kind").$type<AccountKind>().notNull(),
  source: varchar("source").notNull().default("arquivo"), // open_finance | arquivo | manual
  creditLimit: money("credit_limit"),
  used: money("used"),
  /** Saldo que cobra juros (rotativo, cheque especial usado, saldo do empréstimo). */
  debtBalance: money("debt_balance"),
  closingDay: integer("closing_day"),
  dueDay: integer("due_day"),
  /** Taxa de juros do rotativo, cheque ou empréstimo (% a.m.). */
  monthlyRate: rate("monthly_rate"),
  /** Taxa para parcelar a fatura (% a.m.). */
  installmentRate: rate("installment_rate"),
  installmentAmount: money("installment_amount"),
  installmentsLeft: integer("installments_left"),
  ownerName: text("owner_name"),
  label: text("label"),
  createdAt: createdAt(),
});

export const imports = pgTable("imports", {
  id: id(),
  userId: userRef(),
  fileName: text("file_name").notNull(),
  format: varchar("format").notNull(),
  status: varchar("status").notNull().default("lido"), // lido | pendente | erro
  txCount: integer("tx_count").notNull().default(0),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  message: text("message"),
  createdAt: createdAt(),
});

export type TxKind = "gasto" | "entrada" | "transferencia" | "pagamento_fatura";

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    userId: userRef(),
    accountId: varchar("account_id").references(() => accounts.id, { onDelete: "set null" }),
    importId: varchar("import_id").references(() => imports.id, { onDelete: "set null" }),
    date: date("date").notNull(),
    description: text("description").notNull(),
    /** Saída positiva, entrada negativa. */
    amount: money("amount").notNull(),
    kind: varchar("kind").$type<TxKind>().notNull().default("gasto"),
    categoryId: varchar("category_id").notNull().default("compras"),
    groupId: varchar("group_id"),
    notes: text("notes"),
    flag: varchar("flag"), // dup | music | fee
    fingerprint: varchar("fingerprint").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("tx_fingerprint_idx").on(t.userId, t.fingerprint), index("tx_user_date_idx").on(t.userId, t.date)],
);

export const transactionSplits = pgTable("transaction_splits", {
  id: id(),
  userId: userRef(),
  transactionId: varchar("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  target: varchar("target").notNull(), // fatura | divida_pessoal
  targetId: varchar("target_id").notNull(),
  amount: money("amount").notNull(),
});

export const categoryRules = pgTable("category_rules", {
  id: id(),
  userId: userRef(),
  pattern: text("pattern").notNull(),
  categoryId: varchar("category_id"),
  groupId: varchar("group_id"),
  label: text("label"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: createdAt(),
});

export const budgets = pgTable("budgets", {
  id: id(),
  userId: userRef(),
  categoryId: varchar("category_id").notNull(),
  label: text("label").notNull(),
  monthlyLimit: money("monthly_limit").notNull(),
  createdAt: createdAt(),
});

export const subscriptions = pgTable("subscriptions", {
  id: id(),
  userId: userRef(),
  name: text("name").notNull(),
  monogram: varchar("monogram").notNull(),
  amount: money("amount").notNull(),
  accountLabel: text("account_label").notNull(),
  signal: text("signal"),
  signalIcon: varchar("signal_icon"),
  checkin: varchar("checkin"), // usei | nao_usei
  checkinMonth: varchar("checkin_month"),
  createdAt: createdAt(),
});

export type LeakKind = "sub" | "tar" | "seg" | "dup";
export type LeakStatus = "aberto" | "uso" | "ignorado" | "cancelado";

export const leaks = pgTable(
  "leaks",
  {
    id: id(),
    userId: userRef(),
    key: varchar("key").notNull(),
    kind: varchar("kind").$type<LeakKind>().notNull(),
    name: text("name").notNull(),
    monogram: varchar("monogram").notNull(),
    sourceLabel: text("source_label").notNull(),
    amount: money("amount").notNull(),
    reason: text("reason").notNull(),
    cancelWhere: text("cancel_where").notNull(),
    status: varchar("status").$type<LeakStatus>().notNull().default("aberto"),
    protocol: text("protocol"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("leaks_key_idx").on(t.userId, t.key)],
);

export type CommitmentKind = "conta" | "fatura" | "emprestimo" | "imposto" | "divida_pessoal" | "cartao_manual" | "teto" | "assinaturas" | "envelope";
export type Section = "pagar" | "parcelar" | "negociar" | "cortar";
export type DelayRisk = "negativar" | "rotativo" | "suspender" | "cancelar_parcelamento" | "multa";

/** Compromisso recorrente do mês (conta, fatura, parcela, imposto, envelope de teto…). */
export const commitments = pgTable("commitments", {
  id: id(),
  userId: userRef(),
  name: text("name").notNull(),
  kind: varchar("kind").$type<CommitmentKind>().notNull(),
  amount: money("amount").notNull(),
  dueDay: integer("due_day"),
  /** Texto de vencimento quando não há dia fixo ("Teto do mês", "Ao longo do mês"). */
  dueText: text("due_text"),
  /** Prazo de vencimento é no mês seguinte (ex.: fatura que vence 2 nov). */
  dueNextMonth: boolean("due_next_month").notNull().default(false),
  paidMonth: varchar("paid_month"),
  paidDay: integer("paid_day"),
  accountId: varchar("account_id").references(() => accounts.id, { onDelete: "set null" }),
  parcelMonths: integer("parcel_months"),
  delayable: boolean("delayable").notNull().default(false),
  delayCost: money("delay_cost"),
  delayRisk: varchar("delay_risk").$type<DelayRisk>(),
  delayNote: text("delay_note"),
  /** Com quem combinar o adiamento (dívida com pessoa, cartão de familiar). */
  counterpart: text("counterpart"),
  cuttable: boolean("cuttable").notNull().default(false),
  defaultSection: varchar("default_section").$type<Section>(),
  sort: integer("sort").notNull().default(0),
  createdAt: createdAt(),
});

export const priorityDecisions = pgTable(
  "priority_decisions",
  {
    id: id(),
    userId: userRef(),
    month: varchar("month").notNull(),
    commitmentId: varchar("commitment_id").notNull().references(() => commitments.id, { onDelete: "cascade" }),
    section: varchar("section").$type<Section>().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("decision_unique_idx").on(t.userId, t.month, t.commitmentId)],
);

export const rolloverChoices = pgTable(
  "rollover_choices",
  {
    id: id(),
    userId: userRef(),
    month: varchar("month").notNull(),
    commitmentId: varchar("commitment_id").notNull().references(() => commitments.id, { onDelete: "cascade" }),
    route: varchar("route").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("rollover_unique_idx").on(t.userId, t.month, t.commitmentId)],
);

/** Foto mensal para mostrar evolução (dívida total, quitação prevista). */
export const snapshots = pgTable(
  "snapshots",
  {
    id: id(),
    userId: userRef(),
    month: varchar("month").notNull(),
    totalDebt: money("total_debt").notNull(),
    payoffMonth: varchar("payoff_month"),
  },
  (t) => [uniqueIndex("snapshot_unique_idx").on(t.userId, t.month)],
);

export const personalDebts = pgTable("personal_debts", {
  id: id(),
  userId: userRef(),
  creditor: text("creditor").notNull(),
  relation: text("relation"),
  principal: money("principal").notNull(),
  startDate: date("start_date").notNull(),
  monthlyRate: rate("monthly_rate").notNull().default(0),
  plannedMonthly: money("planned_monthly").notNull(),
  createdAt: createdAt(),
});

export const personalDebtPayments = pgTable("personal_debt_payments", {
  id: id(),
  userId: userRef(),
  debtId: varchar("debt_id").notNull().references(() => personalDebts.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  amount: money("amount").notNull(),
  method: text("method").notNull().default("Pix"),
  transactionId: varchar("transaction_id"),
  createdAt: createdAt(),
});

export const expenseGroups = pgTable("expense_groups", {
  id: id(),
  userId: userRef(),
  name: text("name").notNull(),
  description: text("description"),
  icon: varchar("icon").notNull().default("business_center"),
  hue: integer("hue").notNull().default(285),
  createdAt: createdAt(),
});

export const groupObligations = pgTable("group_obligations", {
  id: id(),
  userId: userRef(),
  groupId: varchar("group_id").notNull().references(() => expenseGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: money("amount").notNull(),
  detail: text("detail"),
  installmentsPaid: integer("installments_paid"),
  installmentsTotal: integer("installments_total"),
});

export const goals = pgTable("goals", {
  id: id(),
  userId: userRef(),
  name: text("name").notNull(),
  icon: varchar("icon").notNull().default("savings"),
  target: money("target").notNull(),
  saved: money("saved").notNull().default(0),
  months: integer("months").notNull(),
  startMonth: varchar("start_month").notNull(),
  historyStartedAt: timestamp("history_started_at"),
  isGroup: boolean("is_group").notNull().default(false),
  splitMode: varchar("split_mode").notNull().default("prop"), // igual | prop
  myPrivacy: varchar("my_privacy").notNull().default("contrib"), // contrib | cats
  sources: jsonb("sources").$type<string[]>().notNull().default([]),
  createdAt: createdAt(),
});

export const goalMembers = pgTable("goal_members", {
  id: id(),
  userId: userRef(),
  goalId: varchar("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isMe: boolean("is_me").notNull().default(false),
  /** Renda informada pela pessoa; usada só para a divisão proporcional, nunca exibida. */
  income: money("income"),
  saved: money("saved").notNull().default(0),
  privacy: varchar("privacy").notNull().default("contrib"),
});

export const goalInvites = pgTable("goal_invites", {
  id: id(),
  userId: userRef(),
  goalId: varchar("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  contact: text("contact").notNull(),
  createdAt: createdAt(),
});

/** Histórico append-only; saldos anteriores são capturados na primeira consulta/escrita. */
export const goalContributions = pgTable("goal_contributions", {
  id: id(),
  sequence: integer("sequence").generatedAlwaysAsIdentity(),
  userId: userRef(),
  goalId: varchar("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").references(() => goalMembers.id, { onDelete: "set null" }),
  actorId: varchar("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorName: text("actor_name"),
  participantName: text("participant_name").notNull(),
  kind: varchar("kind").$type<"initial" | "contribution" | "reversal" | "correction">().notNull(),
  amount: money("amount").notNull(),
  reversesId: varchar("reverses_id"),
  replacesId: varchar("replaces_id"),
  reason: text("reason"),
  idempotencyKey: varchar("idempotency_key"),
  requestFingerprint: text("request_fingerprint"),
  createdAt: createdAt(),
}, (t) => [
  index("goal_contributions_history_idx").on(t.userId, t.goalId, t.createdAt),
  uniqueIndex("goal_contributions_request_idx").on(t.goalId, t.idempotencyKey),
  uniqueIndex("goal_contributions_reversal_idx").on(t.reversesId),
]);

export const chatMessages = pgTable("chat_messages", {
  id: id(),
  userId: userRef(),
  role: varchar("role").notNull(), // me | pp
  kind: varchar("kind").notNull(), // text | audio | photo | card
  text: text("text"),
  card: jsonb("card").$type<Record<string, unknown>>(),
  channel: varchar("channel").notNull().default("app"), // app | whatsapp
  createdAt: createdAt(),
});

export const whatsappLinks = pgTable("whatsapp_links", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  phone: varchar("phone"),
  status: varchar("status").notNull().default("off"), // off | code | on
  codeHash: text("code_hash"),
  alerts: jsonb("alerts").$type<{ teto: boolean; venc: boolean; sem: boolean; ext: boolean }>().notNull().default({ teto: true, venc: true, sem: true, ext: false }),
});

export type User = typeof users.$inferSelect;
export type Income = typeof incomes.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type ImportRow = typeof imports.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type TransactionSplit = typeof transactionSplits.$inferSelect;
export type CategoryRule = typeof categoryRules.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Leak = typeof leaks.$inferSelect;
export type Commitment = typeof commitments.$inferSelect;
export type PriorityDecision = typeof priorityDecisions.$inferSelect;
export type RolloverChoice = typeof rolloverChoices.$inferSelect;
export type Snapshot = typeof snapshots.$inferSelect;
export type PersonalDebt = typeof personalDebts.$inferSelect;
export type PersonalDebtPayment = typeof personalDebtPayments.$inferSelect;
export type ExpenseGroup = typeof expenseGroups.$inferSelect;
export type GroupObligation = typeof groupObligations.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type GoalMember = typeof goalMembers.$inferSelect;
export type GoalInvite = typeof goalInvites.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type WhatsappLink = typeof whatsappLinks.$inferSelect;

/** Usuário como o cliente vê (sem hash de senha). */
export type PublicUser = Omit<User, "passwordHash" | "name"> & { name: string };
