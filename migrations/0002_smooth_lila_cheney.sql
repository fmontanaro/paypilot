ALTER TABLE "goal_contributions" ADD COLUMN "sequence" integer NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "goal_contributions_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD COLUMN "replaces_id" varchar;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "history_started_at" timestamp;