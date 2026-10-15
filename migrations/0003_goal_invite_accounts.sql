ALTER TABLE "goal_invites" ADD COLUMN "token_hash" varchar;--> statement-breakpoint
ALTER TABLE "goal_invites" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "goal_invites" ADD COLUMN "accepted_by" varchar;--> statement-breakpoint
ALTER TABLE "goal_invites" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "goal_members" ADD COLUMN "account_id" varchar;--> statement-breakpoint
ALTER TABLE "goal_invites" ADD CONSTRAINT "goal_invites_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_members" ADD CONSTRAINT "goal_members_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "goal_invites_token_idx" ON "goal_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_members_account_idx" ON "goal_members" USING btree ("goal_id","account_id");