CREATE TABLE "goal_contributions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"goal_id" varchar NOT NULL,
	"member_id" varchar,
	"actor_id" varchar,
	"actor_name" text,
	"participant_name" text NOT NULL,
	"kind" varchar NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"reverses_id" varchar,
	"reason" text,
	"idempotency_key" varchar,
	"request_fingerprint" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_member_id_goal_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."goal_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goal_contributions_history_idx" ON "goal_contributions" USING btree ("user_id","goal_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_contributions_request_idx" ON "goal_contributions" USING btree ("goal_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_contributions_reversal_idx" ON "goal_contributions" USING btree ("reverses_id");