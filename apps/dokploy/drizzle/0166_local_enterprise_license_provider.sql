ALTER TABLE "user" ADD COLUMN "enterpriseLicensePlan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "enterpriseLicenseFeatures" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "enterpriseLicenseExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "enterpriseLicenseLastValidatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "enterpriseLicenseValidationSource" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "enterpriseLicenseValidationError" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "enterpriseLicenseGraceUntil" timestamp;
