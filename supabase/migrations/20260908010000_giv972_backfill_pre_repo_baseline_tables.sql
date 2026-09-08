-- GIV-972: backfill pre-repo baseline tables into the migration history.
--
-- The Schema Drift Check (fixed in PR #607 / GIV-971) surfaces 23 public
-- tables that exist in production (project lhbyfidtlhojnrewpstp) but were
-- never created by any migration in this repository. They pre-date migration
-- tracking here: 19 were created by give-protocol-backend's migrations (never
-- recorded in this project's supabase_migrations.schema_migrations), one
-- (charity_organizations) was created there as irs_organizations and renamed
-- by 20260402000000_rename_irs_to_charity_organizations.sql, and three
-- (charity_approvals, profile_update_approvals, volunteer_profiles) were
-- created outside any repo (dashboard/SQL editor era).
--
-- This migration records the missing CREATE TABLE statements so that:
--   * the drift check diff (migrations vs prod) is empty, and
--   * the column/constraint definitions live in-repo, matching prod.
--
-- Provenance: mechanically derived from `supabase db dump --linked
-- --schema public` (GitHub Actions run 34172720887, artifact
-- schema-drift-dump-34172720887). Definitions are copied verbatim; primary
-- key, unique, and foreign key constraints are inlined from the dump's
-- separate ALTER TABLE statements using their production names.
--
-- Safety on production: every table already exists, so each CREATE TABLE IF
-- NOT EXISTS and CREATE INDEX IF NOT EXISTS is a no-op; ALTER TABLE ...
-- ENABLE ROW LEVEL SECURITY is idempotent. On a database that already
-- matches prod this migration only gets recorded in schema_migrations.
-- RLS policies, functions, triggers, and comments on these tables are
-- already managed by earlier migrations in this repository and are
-- deliberately NOT duplicated here.
--
-- Table order satisfies foreign-key dependencies (profiles, skills and
-- donations are created before the tables that reference them).

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" character varying(255),
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "user_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "age_affirmed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text" DEFAULT 'donor'::"text",
    "scheduled_for_deletion_at" timestamp with time zone,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['donor'::"text", 'charity'::"text", 'volunteer'::"text", 'admin'::"text"]))),
    CONSTRAINT "profiles_type_check" CHECK (("type" = ANY (ARRAY['donor'::"text", 'charity'::"text", 'admin'::"text"]))),
    CONSTRAINT "profiles_user_status_check" CHECK (("user_status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'banned'::"text"]))),
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "skills_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "skills_name_key" UNIQUE ("name")
);

CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
);

CREATE TABLE IF NOT EXISTS "public"."charity_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "charity_id" "uuid" NOT NULL,
    "request_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "charity_name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "registration_number" "text",
    "tax_id" "text",
    "registration_document_url" "text",
    "tax_certificate_url" "text",
    "reviewed_by" "uuid",
    "review_notes" "text",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "charity_approvals_request_type_check" CHECK (("request_type" = ANY (ARRAY['new_registration'::"text", 'reactivation'::"text"]))),
    CONSTRAINT "charity_approvals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "charity_approvals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "charity_approvals_charity_id_fkey" FOREIGN KEY ("charity_id") REFERENCES "public"."profiles"("id"),
    CONSTRAINT "charity_approvals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id")
);

CREATE TABLE IF NOT EXISTS "public"."charity_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "charity_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "charity_categories_name_key" UNIQUE ("name")
);

CREATE TABLE IF NOT EXISTS "public"."charity_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "image_url" "text",
    "total_received" numeric DEFAULT 0,
    "available_balance" numeric DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "impact_highlights" "text"[] DEFAULT '{}'::"text"[],
    "mission_statement" "text" DEFAULT ''::"text",
    "impact_stats" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "charity_details_available_balance_positive" CHECK (("available_balance" >= (0)::numeric)),
    CONSTRAINT "charity_details_total_received_positive" CHECK (("total_received" >= (0)::numeric)),
    CONSTRAINT "check_available_balance_positive" CHECK (("available_balance" >= (0)::numeric)),
    CONSTRAINT "check_available_balance_total" CHECK (("available_balance" <= "total_received")),
    CONSTRAINT "check_total_received_positive" CHECK (("total_received" >= (0)::numeric)),
    CONSTRAINT "charity_details_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "charity_details_profile_id_key" UNIQUE ("profile_id"),
    CONSTRAINT "charity_details_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."charity_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "charity_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "document_url" "text" NOT NULL,
    "verified" boolean DEFAULT false,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "verified_at" timestamp with time zone,
    CONSTRAINT "charity_documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['tax_certificate'::"text", 'registration'::"text", 'annual_report'::"text"]))),
    CONSTRAINT "charity_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "charity_documents_charity_id_fkey" FOREIGN KEY ("charity_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."charity_organizations" (
    "ein" "text" NOT NULL,
    "name" "text" NOT NULL,
    "ico" "text",
    "street" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "group_exemption" "text",
    "subsection" "text",
    "affiliation" "text",
    "classification" "text",
    "ruling" "text",
    "deductibility" "text",
    "foundation" "text",
    "activity" "text",
    "organization" "text",
    "status" "text",
    "ntee_cd" "text",
    "is_on_platform" boolean DEFAULT false,
    "platform_charity_id" "uuid",
    "sort_name" "text",
    "country" character varying(2) DEFAULT 'US'::character varying NOT NULL,
    "registry_source" character varying(50) DEFAULT 'IRS_BMF'::character varying NOT NULL,
    "email" character varying(255),
    "phone" character varying(50),
    "search_vector" "tsvector" GENERATED ALWAYS AS (((("setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("name", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("city", ''::"text")), 'B'::"char")) || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("state", ''::"text")), 'C'::"char")) || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("ntee_cd", ''::"text")), 'D'::"char"))) STORED,
    "data_source" "text",
    "data_vintage" "date",
    "last_synced_at" timestamp with time zone,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "irs_organizations_pkey" PRIMARY KEY ("ein"),
    CONSTRAINT "charity_organizations_ein_country_key" UNIQUE ("ein", "country"),
    CONSTRAINT "charity_organizations_id_key" UNIQUE ("id")
);

CREATE TABLE IF NOT EXISTS "public"."donations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "donor_id" "uuid" NOT NULL,
    "charity_id" "uuid" NOT NULL,
    "amount" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "donations_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "donations_amount_positive" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "donations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "donations_charity_id_fkey" FOREIGN KEY ("charity_id") REFERENCES "public"."profiles"("id"),
    CONSTRAINT "donations_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."profiles"("id")
);

CREATE TABLE IF NOT EXISTS "public"."donation_impacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "donation_id" "uuid",
    "metric_name" "text" NOT NULL,
    "metric_value" numeric NOT NULL,
    "impact_description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "donation_impacts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "donation_impacts_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."donor_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "preferred_categories" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "donation_frequency" "text",
    "total_donated" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "donor_profiles_donation_frequency_check" CHECK (("donation_frequency" = ANY (ARRAY['one-time'::"text", 'monthly'::"text", 'quarterly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "donor_profiles_total_donated_positive" CHECK (("total_donated" >= (0)::numeric)),
    CONSTRAINT "donor_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "donor_profiles_profile_id_key" UNIQUE ("profile_id"),
    CONSTRAINT "donor_profiles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."fiat_donations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "donor_id" "uuid",
    "charity_id" "uuid",
    "amount_cents" numeric DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "disbursement_status" "text" DEFAULT 'pending'::"text",
    "donor_email" "text",
    "donor_name" "text",
    "donor_address" "text",
    "payment_method" "text",
    "transaction_id" "text",
    "card_type" "text",
    "card_last_four" "text",
    "fee_covered" boolean,
    "subscription_id" "uuid",
    "cause_id" "uuid",
    "fund_id" "uuid",
    "cause_name" "text",
    "fund_name" "text",
    CONSTRAINT "fiat_donations_disbursement_status_check" CHECK (("disbursement_status" = ANY (ARRAY['pending'::"text", 'disbursed'::"text", 'failed'::"text"]))),
    CONSTRAINT "fiat_donations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."fund_impact_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "text" NOT NULL,
    "unit_name" "text" NOT NULL,
    "unit_cost_usd" numeric(12,4) NOT NULL,
    "unit_icon" "text" DEFAULT 'heart'::"text" NOT NULL,
    "description_template" "text" DEFAULT 'This could provide {{value}} {{unit_name}}'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fund_impact_metrics_unit_cost_usd_check" CHECK (("unit_cost_usd" > (0)::numeric)),
    CONSTRAINT "fund_impact_metrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."impact_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "charity_id" "uuid" NOT NULL,
    "metric_name" "text" NOT NULL,
    "metric_value" numeric NOT NULL,
    "time_period" "tstzrange" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "impact_metrics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "impact_metrics_charity_id_fkey" FOREIGN KEY ("charity_id") REFERENCES "public"."profiles"("id")
);

CREATE TABLE IF NOT EXISTS "public"."profile_update_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "charity_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "current_name" "text",
    "current_description" "text",
    "current_category" "text",
    "current_image_url" "text",
    "new_name" "text",
    "new_description" "text",
    "new_category" "text",
    "new_image_url" "text",
    "supporting_documents" "jsonb" DEFAULT '[]'::"jsonb",
    "update_reason" "text",
    "reviewed_by" "uuid",
    "review_notes" "text",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profile_update_approvals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "profile_update_approvals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profile_update_approvals_charity_id_fkey" FOREIGN KEY ("charity_id") REFERENCES "public"."profiles"("id"),
    CONSTRAINT "profile_update_approvals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id")
);

CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip_address" "text" NOT NULL,
    "endpoint" "text" NOT NULL,
    "request_count" integer DEFAULT 1,
    "window_start" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rate_limits_ip_address_endpoint_key" UNIQUE ("ip_address", "endpoint")
);

CREATE TABLE IF NOT EXISTS "public"."removal_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "removal_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."skill_endorsements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endorser_id" "uuid",
    "recipient_id" "uuid",
    "skill_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "different_users" CHECK (("endorser_id" <> "recipient_id")),
    CONSTRAINT "skill_endorsements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "skill_endorsements_endorser_id_recipient_id_skill_id_key" UNIQUE ("endorser_id", "recipient_id", "skill_id"),
    CONSTRAINT "skill_endorsements_endorser_id_fkey" FOREIGN KEY ("endorser_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "skill_endorsements_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "skill_endorsements_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "notification_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "privacy_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."user_skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "skill_id" "uuid",
    "proficiency_level" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_skills_proficiency_level_check" CHECK (("proficiency_level" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'expert'::"text"]))),
    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_skills_user_id_skill_id_key" UNIQUE ("user_id", "skill_id"),
    CONSTRAINT "user_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE CASCADE,
    CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."volunteer_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone_number" "text",
    "date_of_birth" "date",
    "skills" "text"[] DEFAULT '{}'::"text"[],
    "interests" "text"[] DEFAULT '{}'::"text"[],
    "certifications" "text"[] DEFAULT '{}'::"text"[],
    "experience" "text",
    "availability" "jsonb" DEFAULT '{"evenings": false, "weekdays": false, "weekends": false}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "volunteer_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "volunteer_profiles_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "volunteer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
);

CREATE TABLE IF NOT EXISTS "public"."waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "signed_up_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "waitlist_email_key" UNIQUE ("email")
);

CREATE TABLE IF NOT EXISTS "public"."withdrawal_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "charity_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    CONSTRAINT "check_withdrawal_amount_positive" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "withdrawal_requests_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "withdrawal_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "withdrawal_requests_charity_id_fkey" FOREIGN KEY ("charity_id") REFERENCES "public"."profiles"("id")
);

-- Indexes (production names and definitions, verbatim from the dump).

CREATE INDEX IF NOT EXISTS "charity_documents_charity_id_idx" ON "public"."charity_documents" USING "btree" ("charity_id");

CREATE INDEX IF NOT EXISTS "donor_profiles_profile_id_idx" ON "public"."donor_profiles" USING "btree" ("profile_id");

CREATE INDEX IF NOT EXISTS "idx_active_withdrawals" ON "public"."withdrawal_requests" USING "btree" ("charity_id") WHERE ("status" = 'pending'::"text");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_charity_approvals_charity_id" ON "public"."charity_approvals" USING "btree" ("charity_id");

CREATE INDEX IF NOT EXISTS "idx_charity_approvals_reviewed_by" ON "public"."charity_approvals" USING "btree" ("reviewed_by");

CREATE INDEX IF NOT EXISTS "idx_charity_approvals_status" ON "public"."charity_approvals" USING "btree" ("status");

CREATE INDEX IF NOT EXISTS "idx_charity_details_total_received" ON "public"."charity_details" USING "btree" ("total_received" DESC);

CREATE INDEX IF NOT EXISTS "idx_charity_organizations_country" ON "public"."charity_organizations" USING "btree" ("country");

CREATE INDEX IF NOT EXISTS "idx_charity_organizations_country_sort_name" ON "public"."charity_organizations" USING "btree" ("country", "sort_name");

CREATE INDEX IF NOT EXISTS "idx_charity_organizations_search_vector" ON "public"."charity_organizations" USING "gin" ("search_vector");

CREATE INDEX IF NOT EXISTS "idx_donation_impacts_donation" ON "public"."donation_impacts" USING "btree" ("donation_id");

CREATE INDEX IF NOT EXISTS "idx_donations_amount" ON "public"."donations" USING "btree" ("amount");

CREATE INDEX IF NOT EXISTS "idx_donations_charity_id" ON "public"."donations" USING "btree" ("charity_id");

CREATE INDEX IF NOT EXISTS "idx_donations_created_at_amount" ON "public"."donations" USING "btree" ("created_at" DESC, "amount");

CREATE INDEX IF NOT EXISTS "idx_donations_donor_id" ON "public"."donations" USING "btree" ("donor_id");

CREATE INDEX IF NOT EXISTS "idx_fiat_donations_disbursement_status" ON "public"."fiat_donations" USING "btree" ("disbursement_status");

CREATE INDEX IF NOT EXISTS "idx_fund_impact_metrics_fund_id" ON "public"."fund_impact_metrics" USING "btree" ("fund_id");

CREATE INDEX IF NOT EXISTS "idx_irs_orgs_is_on_platform" ON "public"."charity_organizations" USING "btree" ("is_on_platform");

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "idx_irs_orgs_name_trgm" ON "public"."charity_organizations" USING "gin" ("name" "extensions"."gin_trgm_ops");

CREATE INDEX IF NOT EXISTS "idx_irs_orgs_ntee_cd" ON "public"."charity_organizations" USING "btree" ("ntee_cd");

CREATE INDEX IF NOT EXISTS "idx_irs_orgs_state" ON "public"."charity_organizations" USING "btree" ("state");

CREATE INDEX IF NOT EXISTS "idx_profile_update_approvals_charity_id" ON "public"."profile_update_approvals" USING "btree" ("charity_id");

CREATE INDEX IF NOT EXISTS "idx_profile_update_approvals_reviewed_by" ON "public"."profile_update_approvals" USING "btree" ("reviewed_by");

CREATE INDEX IF NOT EXISTS "idx_profile_update_approvals_status" ON "public"."profile_update_approvals" USING "btree" ("status");

CREATE INDEX IF NOT EXISTS "idx_profiles_charity_name" ON "public"."profiles" USING "btree" ("type", "name") WHERE ("type" = 'charity'::"text");

CREATE INDEX IF NOT EXISTS "idx_profiles_created_at" ON "public"."profiles" USING "btree" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_profiles_name" ON "public"."profiles" USING "btree" ("name");

CREATE INDEX IF NOT EXISTS "idx_profiles_scheduled_for_deletion" ON "public"."profiles" USING "btree" ("scheduled_for_deletion_at") WHERE ("scheduled_for_deletion_at" IS NOT NULL);

CREATE INDEX IF NOT EXISTS "idx_profiles_type" ON "public"."profiles" USING "btree" ("type");

CREATE INDEX IF NOT EXISTS "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_skill_endorsements_endorser_id" ON "public"."skill_endorsements" USING "btree" ("endorser_id");

CREATE INDEX IF NOT EXISTS "idx_skill_endorsements_recipient_id" ON "public"."skill_endorsements" USING "btree" ("recipient_id");

CREATE INDEX IF NOT EXISTS "idx_skill_endorsements_skill_id" ON "public"."skill_endorsements" USING "btree" ("skill_id");

CREATE INDEX IF NOT EXISTS "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_user_skills_skill_id" ON "public"."user_skills" USING "btree" ("skill_id");

CREATE INDEX IF NOT EXISTS "idx_user_skills_user_id" ON "public"."user_skills" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_volunteer_profiles_user_id" ON "public"."volunteer_profiles" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_withdrawal_requests_charity_id" ON "public"."withdrawal_requests" USING "btree" ("charity_id");

CREATE INDEX IF NOT EXISTS "impact_metrics_charity_id_idx" ON "public"."impact_metrics" USING "btree" ("charity_id");

CREATE INDEX IF NOT EXISTS "impact_metrics_time_period_idx" ON "public"."impact_metrics" USING "gist" ("time_period");

CREATE INDEX IF NOT EXISTS "withdrawal_requests_charity_id_created_at_idx" ON "public"."withdrawal_requests" USING "btree" ("charity_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "withdrawal_requests_status_idx" ON "public"."withdrawal_requests" USING "btree" ("status");

-- Row-level security (policies themselves are managed by earlier migrations).

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."skills" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."charity_approvals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."charity_categories" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."charity_details" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."charity_documents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."charity_organizations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."donations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."donation_impacts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."donor_profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."fiat_donations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."fund_impact_metrics" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."impact_metrics" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profile_update_approvals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."removal_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."skill_endorsements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_skills" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."volunteer_profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."withdrawal_requests" ENABLE ROW LEVEL SECURITY;
