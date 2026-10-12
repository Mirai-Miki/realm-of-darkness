CREATE TABLE "interaction_sessions" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"handler_id" varchar(64) NOT NULL,
	"step" varchar(64) NOT NULL,
	"state" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vampire_5th" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "vampire_5th" CASCADE;--> statement-breakpoint
DROP INDEX "characters_name_user_idx";--> statement-breakpoint
DROP INDEX "characters_chronicle_idx";--> statement-breakpoint
DROP INDEX "characters_user_chronicle_idx";--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "avatar_url" varchar(500);--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "theme_color" varchar(10) DEFAULT '#000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "data" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "interaction_sessions" ADD CONSTRAINT "interaction_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interaction_sessions_user_id_idx" ON "interaction_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interaction_sessions_expires_at_idx" ON "interaction_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "characters_user_id_idx" ON "characters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "characters_chronicle_id_idx" ON "characters" USING btree ("chronicle_id");--> statement-breakpoint
CREATE INDEX "characters_splat_idx" ON "characters" USING btree ("splat");--> statement-breakpoint
CREATE INDEX "characters_name_idx" ON "characters" USING btree ("name");--> statement-breakpoint
CREATE INDEX "characters_user_chronicle_idx" ON "characters" USING btree ("user_id","chronicle_id");