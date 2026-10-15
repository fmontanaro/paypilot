CREATE TABLE "accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"connection_id" varchar,
	"institution" varchar NOT NULL,
	"name" text NOT NULL,
	"kind" varchar NOT NULL,
	"source" varchar DEFAULT 'arquivo' NOT NULL,
	"credit_limit" numeric(14,2),
	"used" numeric(14,2),
	"debt_balance" numeric(14,2),
	"closing_day" integer,
	"due_day" integer,
	"monthly_rate" numeric(7,3),
	"installment_rate" numeric(7,3),
	"installment_amount" numeric(14,2),
	"installments_left" integer,
	"owner_name" text,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"category_id" varchar NOT NULL,
	"label" text NOT NULL,
	"monthly_limit" numeric(14,2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"pattern" text NOT NULL,
	"category_id" varchar,
	"group_id" varchar,
	"label" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar NOT NULL,
	"kind" varchar NOT NULL,
	"text" text,
	"card" jsonb,
	"channel" varchar DEFAULT 'app' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commitments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"kind" varchar NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"due_day" integer,
	"due_text" text,
	"due_next_month" boolean DEFAULT false NOT NULL,
	"paid_month" varchar,
	"paid_day" integer,
	"account_id" varchar,
	"parcel_months" integer,
	"delayable" boolean DEFAULT false NOT NULL,
	"delay_cost" numeric(14,2),
	"delay_risk" varchar,
	"delay_note" text,
	"counterpart" text,
	"cuttable" boolean DEFAULT false NOT NULL,
	"default_section" varchar,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" varchar DEFAULT 'sandbox' NOT NULL,
	"institution" varchar NOT NULL,
	"items_label" text DEFAULT '' NOT NULL,
	"status" varchar DEFAULT 'ok' NOT NULL,
	"last_sync_at" timestamp DEFAULT now() NOT NULL,
	"last_error" text,
	"consent_expires_at" timestamp NOT NULL,
	"external_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" varchar DEFAULT 'business_center' NOT NULL,
	"hue" integer DEFAULT 285 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_invites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"goal_id" varchar NOT NULL,
	"contact" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"goal_id" varchar NOT NULL,
	"name" text NOT NULL,
	"is_me" boolean DEFAULT false NOT NULL,
	"income" numeric(14,2),
	"saved" numeric(14,2) DEFAULT 0 NOT NULL,
	"privacy" varchar DEFAULT 'contrib' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"icon" varchar DEFAULT 'savings' NOT NULL,
	"target" numeric(14,2) NOT NULL,
	"saved" numeric(14,2) DEFAULT 0 NOT NULL,
	"months" integer NOT NULL,
	"start_month" varchar NOT NULL,
	"is_group" boolean DEFAULT false NOT NULL,
	"split_mode" varchar DEFAULT 'prop' NOT NULL,
	"my_privacy" varchar DEFAULT 'contrib' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_obligations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"group_id" varchar NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"detail" text,
	"installments_paid" integer,
	"installments_total" integer
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"format" varchar NOT NULL,
	"status" varchar DEFAULT 'lido' NOT NULL,
	"tx_count" integer DEFAULT 0 NOT NULL,
	"period_start" date,
	"period_end" date,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"pay_day" integer DEFAULT 5 NOT NULL,
	"recurring" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"key" varchar NOT NULL,
	"kind" varchar NOT NULL,
	"name" text NOT NULL,
	"monogram" varchar NOT NULL,
	"source_label" text NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"reason" text NOT NULL,
	"cancel_where" text NOT NULL,
	"status" varchar DEFAULT 'aberto' NOT NULL,
	"protocol" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_debt_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"debt_id" varchar NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"method" text DEFAULT 'Pix' NOT NULL,
	"transaction_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_debts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"creditor" text NOT NULL,
	"relation" text,
	"principal" numeric(14,2) NOT NULL,
	"start_date" date NOT NULL,
	"monthly_rate" numeric(7,3) DEFAULT 0 NOT NULL,
	"planned_monthly" numeric(14,2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priority_decisions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"month" varchar NOT NULL,
	"commitment_id" varchar NOT NULL,
	"section" varchar NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rollover_choices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"month" varchar NOT NULL,
	"commitment_id" varchar NOT NULL,
	"route" varchar NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"device" text,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"month" varchar NOT NULL,
	"total_debt" numeric(14,2) NOT NULL,
	"payoff_month" varchar
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"monogram" varchar NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"account_label" text NOT NULL,
	"signal" text,
	"signal_icon" varchar,
	"checkin" varchar,
	"checkin_month" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_splits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"transaction_id" varchar NOT NULL,
	"target" varchar NOT NULL,
	"target_id" varchar NOT NULL,
	"amount" numeric(14,2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"account_id" varchar,
	"import_id" varchar,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"kind" varchar DEFAULT 'gasto' NOT NULL,
	"category_id" varchar DEFAULT 'compras' NOT NULL,
	"group_id" varchar,
	"notes" text,
	"flag" varchar,
	"fingerprint" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"phone" varchar,
	"name" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"plan" varchar DEFAULT 'gratis' NOT NULL,
	"prefs" jsonb DEFAULT '{"theme":"claro","biometric":true,"notifications":{"teto":true,"venc":true,"sem":true,"ext":true},"importReminder":true}'::jsonb NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"onboarded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_links" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"phone" varchar,
	"status" varchar DEFAULT 'off' NOT NULL,
	"code_hash" text,
	"alerts" jsonb DEFAULT '{"teto":true,"venc":true,"sem":true,"ext":false}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_groups" ADD CONSTRAINT "expense_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_invites" ADD CONSTRAINT "goal_invites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_invites" ADD CONSTRAINT "goal_invites_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_members" ADD CONSTRAINT "goal_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_members" ADD CONSTRAINT "goal_members_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_obligations" ADD CONSTRAINT "group_obligations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_obligations" ADD CONSTRAINT "group_obligations_group_id_expense_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."expense_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaks" ADD CONSTRAINT "leaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_debt_payments" ADD CONSTRAINT "personal_debt_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_debt_payments" ADD CONSTRAINT "personal_debt_payments_debt_id_personal_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."personal_debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_debts" ADD CONSTRAINT "personal_debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority_decisions" ADD CONSTRAINT "priority_decisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority_decisions" ADD CONSTRAINT "priority_decisions_commitment_id_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollover_choices" ADD CONSTRAINT "rollover_choices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollover_choices" ADD CONSTRAINT "rollover_choices_commitment_id_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_links" ADD CONSTRAINT "whatsapp_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "leaks_key_idx" ON "leaks" USING btree ("user_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "decision_unique_idx" ON "priority_decisions" USING btree ("user_id","month","commitment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rollover_unique_idx" ON "rollover_choices" USING btree ("user_id","month","commitment_id");--> statement-breakpoint
CREATE INDEX "sessions_expire_idx" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "snapshot_unique_idx" ON "snapshots" USING btree ("user_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "tx_fingerprint_idx" ON "transactions" USING btree ("user_id","fingerprint");--> statement-breakpoint
CREATE INDEX "tx_user_date_idx" ON "transactions" USING btree ("user_id","date");