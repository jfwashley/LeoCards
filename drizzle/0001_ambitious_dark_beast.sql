ALTER TABLE "cards" ADD COLUMN "masteryRound" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "cooldownUntil" timestamp;--> statement-breakpoint
ALTER TABLE "recall_events" ADD COLUMN "direction" text NOT NULL;