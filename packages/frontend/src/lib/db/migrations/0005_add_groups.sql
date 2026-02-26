-- Groups feature: groups, group_members, group_invites

CREATE TABLE IF NOT EXISTS "groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "description" text,
  "avatar_url" text,
  "is_public" boolean DEFAULT true NOT NULL,
  "invite_code" varchar(32),
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "groups_slug_unique" UNIQUE("slug"),
  CONSTRAINT "groups_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" varchar(10) DEFAULT 'member' NOT NULL,
  "invited_by" uuid,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "group_members_group_user_unique" UNIQUE("group_id", "user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "invited_username" varchar(39),
  "invited_user_id" uuid,
  "invited_by" uuid NOT NULL,
  "role" varchar(10) DEFAULT 'member' NOT NULL,
  "status" varchar(10) DEFAULT 'pending' NOT NULL,
  "token" varchar(64) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "group_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_groups_slug" ON "groups" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_groups_created_by" ON "groups" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_groups_is_public" ON "groups" USING btree ("is_public");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_group_members_group_id" ON "group_members" USING btree ("group_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_group_members_user_id" ON "group_members" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_group_invites_group_id" ON "group_invites" USING btree ("group_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_group_invites_invited_user_id" ON "group_invites" USING btree ("invited_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_group_invites_token" ON "group_invites" USING btree ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_group_invites_status" ON "group_invites" USING btree ("status");
