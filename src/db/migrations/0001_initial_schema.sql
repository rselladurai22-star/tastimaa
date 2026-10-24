CREATE TYPE "public"."area_type" AS ENUM('nation', 'region', 'county', 'local_authority', 'test_area', 'education_authority');--> statement-breakpoint
CREATE TYPE "public"."boarding" AS ENUM('none', 'boarding', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."boundary_kind" AS ENUM('official_catchment', 'priority_area', 'designated_area', 'test_area');--> statement-breakpoint
CREATE TYPE "public"."catchment_type" AS ENUM('none', 'defined_area', 'distance_only', 'multiple_areas', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."criterion_category" AS ENUM('qualification_required', 'looked_after', 'previously_looked_after', 'ehcp_named', 'pupil_premium', 'free_school_meals', 'sibling', 'staff_child', 'medical_social', 'catchment_resident', 'distance', 'feeder_school', 'faith', 'score_rank', 'random_allocation', 'other');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('active', 'superseded', 'withdrawn', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."event_scope" AS ENUM('nation', 'local_authority', 'test_area', 'school');--> statement-breakpoint
CREATE TYPE "public"."admission_event_type" AS ENUM('open_event', 'registration_opens', 'registration_closes', 'test_date', 'results_released', 'application_deadline', 'supplementary_form_deadline', 'national_offer_day', 'offer_response_deadline', 'waiting_list', 'appeal_deadline', 'appeal_hearings', 'other');--> statement-breakpoint
CREATE TYPE "public"."gender_policy" AS ENUM('boys', 'girls', 'mixed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."ingestion_status" AS ENUM('running', 'succeeded', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."inspection_framework" AS ENUM('report_card_2025', 'eif_2019', 'eif_2019_ungraded', 'pre_2019');--> statement-breakpoint
CREATE TYPE "public"."nation" AS ENUM('england', 'northern_ireland', 'wales', 'scotland');--> statement-breakpoint
CREATE TYPE "public"."out_of_area_route" AS ENUM('yes', 'no', 'limited', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."policy_status" AS ENUM('draft', 'awaiting_verification', 'published', 'superseded', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('open', 'in_review', 'approved', 'rejected', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."review_task_type" AS ENUM('extracted_rule', 'extracted_policy', 'conflicting_sources', 'stale_record', 'missing_field', 'user_correction', 'ingestion_failure', 'identity_match', 'change_detected');--> statement-breakpoint
CREATE TYPE "public"."score_rule_kind" AS ENUM('qualifying_threshold', 'automatic_qualification', 'ranked_by_score', 'priority_threshold', 'reserved_places_threshold');--> statement-breakpoint
CREATE TYPE "public"."selectivity" AS ENUM('fully_selective', 'partially_selective', 'selective_stream', 'non_selective');--> statement-breakpoint
CREATE TYPE "public"."source_method" AS ENUM('bulk_download', 'api', 'admin_upload', 'manual_entry', 'web_document');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('parent', 'editor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('officially_verified', 'awaiting_verification', 'historical', 'estimated', 'unavailable', 'conflicting');--> statement-breakpoint
CREATE TABLE "academic_results" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "academic_results_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"school_id" integer NOT NULL,
	"measure" text NOT NULL,
	"academic_year" text NOT NULL,
	"breakdown" text DEFAULT 'total' NOT NULL,
	"value" double precision,
	"value_text" text,
	"status_code" text,
	"cohort" integer,
	"data_version" text,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_results_year_ck" CHECK ("academic_results"."academic_year" ~ '^[0-9]{4}/[0-9]{2}$')
);
--> statement-breakpoint
CREATE TABLE "admin_review_tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_review_tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" "review_task_type" NOT NULL,
	"status" "review_status" DEFAULT 'open' NOT NULL,
	"priority" integer DEFAULT 3 NOT NULL,
	"title" text NOT NULL,
	"school_id" integer,
	"entity_type" text,
	"entity_id" integer,
	"payload" jsonb,
	"evidence_document_id" integer,
	"evidence_locator" text,
	"evidence_quote" text,
	"submitted_by_email" text,
	"created_by" integer,
	"assigned_to" integer,
	"resolved_by" integer,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_criteria" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admission_criteria_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"policy_id" integer NOT NULL,
	"rank" integer NOT NULL,
	"category" "criterion_category" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"requires_qualification" boolean,
	"places_reserved" integer,
	"conditions" jsonb,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "admission_cycles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admission_cycles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nation" "nation" NOT NULL,
	"entry_year" integer NOT NULL,
	"entry_point" text NOT NULL,
	"label" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "admission_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admission_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"cycle_id" integer NOT NULL,
	"scope" "event_scope" NOT NULL,
	"school_id" integer,
	"test_id" integer,
	"area_id" integer,
	"event_type" "admission_event_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"time_note" text,
	"url" text,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_policies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admission_policies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"school_id" integer NOT NULL,
	"cycle_id" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "policy_status" DEFAULT 'draft' NOT NULL,
	"determined_on" date,
	"published_admission_number" integer,
	"test_id" integer,
	"catchment_type" "catchment_type" DEFAULT 'unknown' NOT NULL,
	"out_of_area_route" "out_of_area_route" DEFAULT 'unknown' NOT NULL,
	"summary" text,
	"qualification_summary" text,
	"catchment_summary" text,
	"distance_method" text,
	"tie_break" text,
	"waiting_list" text,
	"appeals" text,
	"late_applications" text,
	"in_year_admissions" text,
	"supplementary_form" text,
	"address_rules" text,
	"approved_by" integer,
	"approved_at" timestamp with time zone,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_queries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ai_queries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"question" text NOT NULL,
	"answer" text,
	"mode" text NOT NULL,
	"model" text,
	"citations" jsonb,
	"latency_ms" integer,
	"helpful" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "area_results" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "area_results_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"area_code" text NOT NULL,
	"area_level" text NOT NULL,
	"area_name" text NOT NULL,
	"measure" text NOT NULL,
	"academic_year" text NOT NULL,
	"population" text DEFAULT 'all_state_funded' NOT NULL,
	"value" double precision,
	"value_text" text,
	"status_code" text,
	"data_version" text,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catchment_boundaries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "catchment_boundaries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"school_id" integer,
	"policy_id" integer,
	"name" text NOT NULL,
	"kind" "boundary_kind" NOT NULL,
	"geometry" geography(MultiPolygon,4326) NOT NULL,
	"effective_entry_year" integer NOT NULL,
	"licence" text NOT NULL,
	"version" text,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "change_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"school_id" integer,
	"run_id" integer,
	"entity" text NOT NULL,
	"field" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparisons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comparisons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"school_ids" integer[] NOT NULL,
	"entry_year" integer,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comparisons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "entrance_tests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "entrance_tests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"provider_id" integer,
	"nation" "nation" NOT NULL,
	"administered_by" text,
	"area_description" text,
	"components" jsonb,
	"format" text,
	"standardisation" text,
	"score_scale" text,
	"registration_url" text,
	"website" text,
	"summary" text,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entrance_tests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "geographic_areas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "geographic_areas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" "area_type" NOT NULL,
	"nation" "nation" NOT NULL,
	"code" text,
	"legacy_code" text,
	"parent_id" integer,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "geographic_areas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "historical_allocations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "historical_allocations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"school_id" integer NOT NULL,
	"entry_year" integer NOT NULL,
	"round" text DEFAULT 'national_offer_day' NOT NULL,
	"category" text DEFAULT 'all' NOT NULL,
	"metric" text NOT NULL,
	"value" double precision,
	"unit" text,
	"status_code" text,
	"notes" text,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_issues" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ingestion_issues_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"run_id" integer NOT NULL,
	"severity" text NOT NULL,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"record_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ingestion_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_id" integer,
	"job" text NOT NULL,
	"status" "ingestion_status" DEFAULT 'running' NOT NULL,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"document_id" integer,
	"rows_read" integer DEFAULT 0 NOT NULL,
	"rows_inserted" integer DEFAULT 0 NOT NULL,
	"rows_updated" integer DEFAULT 0 NOT NULL,
	"rows_unchanged" integer DEFAULT 0 NOT NULL,
	"rows_rejected" integer DEFAULT 0 NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"error" text,
	"stats" jsonb
);
--> statement-breakpoint
CREATE TABLE "inspection_evaluations" (
	"inspection_id" integer NOT NULL,
	"area" text NOT NULL,
	"grade" text NOT NULL,
	"scale" text NOT NULL,
	CONSTRAINT "inspection_evaluations_inspection_id_area_pk" PRIMARY KEY("inspection_id","area")
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inspections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"school_id" integer NOT NULL,
	"inspection_number" text NOT NULL,
	"framework" "inspection_framework" NOT NULL,
	"inspection_type" text,
	"start_date" date,
	"publication_date" date,
	"urn_at_inspection" text,
	"relates_to_current_urn" boolean,
	"overall_effectiveness" integer,
	"outcome" text,
	"category_of_concern" text,
	"safeguarding" text,
	"report_url" text,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_journeys" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "planner_journeys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"entry_year" integer NOT NULL,
	"nation" "nation" DEFAULT 'england' NOT NULL,
	"school_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postcode_cache" (
	"postcode" text PRIMARY KEY NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"country" text NOT NULL,
	"admin_district" text,
	"admin_county" text,
	"region" text,
	"la_code" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reminder_subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"user_id" integer,
	"school_id" integer,
	"entry_year" integer NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirm_token_hash" text,
	"unsubscribe_token_hash" text NOT NULL,
	"last_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_schools" (
	"user_id" integer NOT NULL,
	"school_id" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_schools_user_id_school_id_pk" PRIMARY KEY("user_id","school_id")
);
--> statement-breakpoint
CREATE TABLE "school_census" (
	"school_id" integer NOT NULL,
	"census_date" date NOT NULL,
	"pupils" integer,
	"boys" integer,
	"girls" integer,
	"capacity" integer,
	"percent_fsm" numeric(5, 2),
	"year_group_counts" jsonb,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	CONSTRAINT "school_census_school_id_census_date_pk" PRIMARY KEY("school_id","census_date")
);
--> statement-breakpoint
CREATE TABLE "school_contacts" (
	"school_id" integer PRIMARY KEY NOT NULL,
	"website" text,
	"telephone" text,
	"head_title" text,
	"head_name" text,
	"head_job_title" text,
	"admissions_email" text,
	"admissions_url" text,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "school_entrance_tests" (
	"school_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"entry_year" integer NOT NULL,
	"notes" text,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	CONSTRAINT "school_entrance_tests_school_id_test_id_entry_year_pk" PRIMARY KEY("school_id","test_id","entry_year")
);
--> statement-breakpoint
CREATE TABLE "school_features" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "school_features_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"school_id" integer NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_identifiers" (
	"school_id" integer NOT NULL,
	"scheme" text NOT NULL,
	"value" text NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	CONSTRAINT "school_identifiers_scheme_value_pk" PRIMARY KEY("scheme","value")
);
--> statement-breakpoint
CREATE TABLE "school_locations" (
	"school_id" integer PRIMARY KEY NOT NULL,
	"street" text,
	"locality" text,
	"address3" text,
	"town" text,
	"county" text,
	"postcode" text,
	"easting" integer,
	"northing" integer,
	"location" geography(Point,4326),
	"location_method" text,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "school_names" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "school_names_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"school_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"context" text,
	"valid_from" date,
	"valid_to" date,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "schools_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"nation" "nation" NOT NULL,
	"selectivity" "selectivity" NOT NULL,
	"status" text NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"establishment_type" text,
	"establishment_group" text,
	"governance" text,
	"phase" text,
	"gender" "gender_policy" DEFAULT 'unknown' NOT NULL,
	"age_low" integer,
	"age_high" integer,
	"has_sixth_form" boolean,
	"boarding" "boarding" DEFAULT 'unknown' NOT NULL,
	"religious_character" text,
	"trust_name" text,
	"trust_code" text,
	"local_authority_id" integer,
	"region_id" integer,
	"open_date" date,
	"close_date" date,
	"search_text" text,
	"search_document" tsvector,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schools_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "score_rules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "score_rules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"policy_id" integer NOT NULL,
	"test_id" integer,
	"kind" "score_rule_kind" NOT NULL,
	"applies_to" text DEFAULT 'all' NOT NULL,
	"score_value" double precision,
	"score_scale" text,
	"description" text NOT NULL,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "source_documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_id" integer NOT NULL,
	"school_id" integer,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"publisher" text,
	"published_at" date,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"academic_year" text,
	"entry_year" integer,
	"version" text,
	"checksum_sha256" text,
	"content_type" text,
	"byte_size" integer,
	"storage_key" text,
	"status" "document_status" DEFAULT 'active' NOT NULL,
	"superseded_by_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_extracts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "source_extracts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"document_id" integer NOT NULL,
	"school_id" integer,
	"locator" text,
	"heading" text,
	"text" text NOT NULL,
	"search_document" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(heading, '') || ' ' || text)) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"name" text NOT NULL,
	"publisher" text NOT NULL,
	"homepage_url" text NOT NULL,
	"licence" text NOT NULL,
	"licence_url" text,
	"method" "source_method" NOT NULL,
	"refresh_cadence" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "test_providers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "test_providers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"nation" "nation",
	"description" text,
	"website" text,
	"source_document_id" integer,
	"source_locator" text,
	"verification_status" "verification_status" DEFAULT 'awaiting_verification' NOT NULL,
	"confidence" "confidence",
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"display_name" text,
	"role" "user_role" DEFAULT 'parent' NOT NULL,
	"password_hash" text,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "academic_results" ADD CONSTRAINT "academic_results_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_results" ADD CONSTRAINT "academic_results_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_review_tasks" ADD CONSTRAINT "admin_review_tasks_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_review_tasks" ADD CONSTRAINT "admin_review_tasks_evidence_document_id_source_documents_id_fk" FOREIGN KEY ("evidence_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_criteria" ADD CONSTRAINT "admission_criteria_policy_id_admission_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."admission_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_criteria" ADD CONSTRAINT "admission_criteria_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_events" ADD CONSTRAINT "admission_events_cycle_id_admission_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."admission_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_events" ADD CONSTRAINT "admission_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_events" ADD CONSTRAINT "admission_events_test_id_entrance_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."entrance_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_events" ADD CONSTRAINT "admission_events_area_id_geographic_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."geographic_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_events" ADD CONSTRAINT "admission_events_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_policies" ADD CONSTRAINT "admission_policies_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_policies" ADD CONSTRAINT "admission_policies_cycle_id_admission_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."admission_cycles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_policies" ADD CONSTRAINT "admission_policies_test_id_entrance_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."entrance_tests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_policies" ADD CONSTRAINT "admission_policies_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_results" ADD CONSTRAINT "area_results_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catchment_boundaries" ADD CONSTRAINT "catchment_boundaries_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catchment_boundaries" ADD CONSTRAINT "catchment_boundaries_policy_id_admission_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."admission_policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catchment_boundaries" ADD CONSTRAINT "catchment_boundaries_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_run_id_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entrance_tests" ADD CONSTRAINT "entrance_tests_provider_id_test_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."test_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entrance_tests" ADD CONSTRAINT "entrance_tests_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_allocations" ADD CONSTRAINT "historical_allocations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_allocations" ADD CONSTRAINT "historical_allocations_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_issues" ADD CONSTRAINT "ingestion_issues_run_id_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_document_id_source_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_evaluations" ADD CONSTRAINT "inspection_evaluations_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_journeys" ADD CONSTRAINT "planner_journeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_subscriptions" ADD CONSTRAINT "reminder_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_subscriptions" ADD CONSTRAINT "reminder_subscriptions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_schools" ADD CONSTRAINT "saved_schools_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_schools" ADD CONSTRAINT "saved_schools_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_census" ADD CONSTRAINT "school_census_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_census" ADD CONSTRAINT "school_census_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_contacts" ADD CONSTRAINT "school_contacts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_contacts" ADD CONSTRAINT "school_contacts_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_entrance_tests" ADD CONSTRAINT "school_entrance_tests_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_entrance_tests" ADD CONSTRAINT "school_entrance_tests_test_id_entrance_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."entrance_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_entrance_tests" ADD CONSTRAINT "school_entrance_tests_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_features" ADD CONSTRAINT "school_features_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_features" ADD CONSTRAINT "school_features_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_identifiers" ADD CONSTRAINT "school_identifiers_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_identifiers" ADD CONSTRAINT "school_identifiers_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_locations" ADD CONSTRAINT "school_locations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_locations" ADD CONSTRAINT "school_locations_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_names" ADD CONSTRAINT "school_names_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_names" ADD CONSTRAINT "school_names_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_local_authority_id_geographic_areas_id_fk" FOREIGN KEY ("local_authority_id") REFERENCES "public"."geographic_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_region_id_geographic_areas_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."geographic_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_rules" ADD CONSTRAINT "score_rules_policy_id_admission_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."admission_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_rules" ADD CONSTRAINT "score_rules_test_id_entrance_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."entrance_tests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_rules" ADD CONSTRAINT "score_rules_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_extracts" ADD CONSTRAINT "source_extracts_document_id_source_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."source_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_providers" ADD CONSTRAINT "test_providers_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_results_uq" ON "academic_results" USING btree ("school_id","measure","academic_year","breakdown");--> statement-breakpoint
CREATE INDEX "academic_results_measure_idx" ON "academic_results" USING btree ("measure","academic_year");--> statement-breakpoint
CREATE INDEX "admin_review_tasks_status_idx" ON "admin_review_tasks" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "admin_review_tasks_school_idx" ON "admin_review_tasks" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_criteria_rank_uq" ON "admission_criteria" USING btree ("policy_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_cycles_uq" ON "admission_cycles" USING btree ("nation","entry_year","entry_point");--> statement-breakpoint
CREATE INDEX "admission_events_cycle_idx" ON "admission_events" USING btree ("cycle_id","starts_on");--> statement-breakpoint
CREATE INDEX "admission_events_school_idx" ON "admission_events" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_policies_version_uq" ON "admission_policies" USING btree ("school_id","cycle_id","version");--> statement-breakpoint
CREATE INDEX "admission_policies_school_idx" ON "admission_policies" USING btree ("school_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "area_results_uq" ON "area_results" USING btree ("area_code","measure","academic_year","population");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "catchment_boundaries_geo_idx" ON "catchment_boundaries" USING gist ("geometry");--> statement-breakpoint
CREATE INDEX "catchment_boundaries_school_idx" ON "catchment_boundaries" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "change_events_school_idx" ON "change_events" USING btree ("school_id","detected_at");--> statement-breakpoint
CREATE INDEX "geographic_areas_type_idx" ON "geographic_areas" USING btree ("type","nation");--> statement-breakpoint
CREATE INDEX "geographic_areas_code_idx" ON "geographic_areas" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "historical_allocations_uq" ON "historical_allocations" USING btree ("school_id","entry_year","round","category","metric");--> statement-breakpoint
CREATE INDEX "historical_allocations_metric_idx" ON "historical_allocations" USING btree ("metric","entry_year");--> statement-breakpoint
CREATE INDEX "ingestion_issues_run_idx" ON "ingestion_issues" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ingestion_runs_job_idx" ON "ingestion_runs" USING btree ("job","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inspections_number_uq" ON "inspections" USING btree ("school_id","inspection_number");--> statement-breakpoint
CREATE INDEX "inspections_school_idx" ON "inspections" USING btree ("school_id","start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_subscriptions_uq" ON "reminder_subscriptions" USING btree ("email","school_id","entry_year");--> statement-breakpoint
CREATE INDEX "school_features_school_idx" ON "school_features" USING btree ("school_id","category");--> statement-breakpoint
CREATE INDEX "school_identifiers_school_idx" ON "school_identifiers" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "school_locations_geo_idx" ON "school_locations" USING gist ("location");--> statement-breakpoint
CREATE INDEX "school_locations_postcode_idx" ON "school_locations" USING btree ("postcode");--> statement-breakpoint
CREATE UNIQUE INDEX "school_names_school_name_uq" ON "school_names" USING btree ("school_id","name");--> statement-breakpoint
CREATE INDEX "schools_nation_idx" ON "schools" USING btree ("nation","selectivity","is_open");--> statement-breakpoint
CREATE INDEX "schools_la_idx" ON "schools" USING btree ("local_authority_id");--> statement-breakpoint
CREATE INDEX "schools_region_idx" ON "schools" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "schools_search_idx" ON "schools" USING gin ("search_document");--> statement-breakpoint
CREATE INDEX "schools_search_text_trgm_idx" ON "schools" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "schools_name_trgm_idx" ON "schools" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "score_rules_policy_idx" ON "score_rules" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "source_documents_source_idx" ON "source_documents" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "source_documents_school_idx" ON "source_documents" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_documents_url_checksum_uq" ON "source_documents" USING btree ("url","checksum_sha256");--> statement-breakpoint
CREATE INDEX "source_extracts_document_idx" ON "source_extracts" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "source_extracts_school_idx" ON "source_extracts" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "source_extracts_search_idx" ON "source_extracts" USING gin ("search_document");