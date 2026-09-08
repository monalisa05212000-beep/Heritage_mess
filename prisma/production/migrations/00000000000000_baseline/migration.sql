-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MealTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('PREPAID', 'COUNT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MenuStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('CUSTOMER', 'ADMIN_MANUAL', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "AllocationKind" AS ENUM ('PREPAID', 'COUNT', 'PAYG');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('RESERVED', 'RELEASED', 'CONSUMED', 'VOIDED');

-- CreateEnum
CREATE TYPE "EntitlementEffectType" AS ENUM ('ISSUED', 'RESERVED', 'RESERVATION_RELEASED', 'CONSUMED', 'RESTORED', 'ADJUSTED', 'CARRIED_FORWARD');

-- CreateEnum
CREATE TYPE "CapacityEffectType" AS ENUM ('RESERVED', 'RELEASED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('POSTED', 'INVOICED', 'REVERSED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CHARGE', 'PAYMENT', 'CREDIT', 'ADJUSTMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'VOIDED');

-- CreateEnum
CREATE TYPE "ClosureStatus" AS ENUM ('DRAFT', 'PROCESSED', 'CORRECTED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "normalized_phone" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "pay_as_you_go_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_settings" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "setting_key" TEXT NOT NULL,
    "setting_value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setup_state" (
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setup_state_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "invalidated_at" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_sessions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "invalidated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "ip_hash" TEXT,
    "succeeded" BOOLEAN NOT NULL DEFAULT false,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_events" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_types" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "MealTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL,
    "ordering_cutoff_minutes" INTEGER NOT NULL,
    "cancellation_cutoff_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "meal_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_templates" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SubscriptionType" NOT NULL,
    "required_amount_minor" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_template_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "plan_template_id" UUID NOT NULL,
    "meal_type_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "plan_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "plan_template_id" UUID,
    "type" "SubscriptionType" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "required_amount_minor" INTEGER,
    "paid_amount_minor" INTEGER NOT NULL DEFAULT 0,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "meal_type_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_minor" INTEGER,

    CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prices" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "meal_type_id" UUID NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "menu_date" DATE NOT NULL,
    "status" "MenuStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "meal_type_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "service_date" DATE NOT NULL,
    "source" "OrderSource" NOT NULL,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "service_date" DATE NOT NULL,
    "meal_type_id" UUID NOT NULL,
    "source" "OrderSource" NOT NULL,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'CONFIRMED',
    "quantity" INTEGER NOT NULL,
    "allocation_kind" "AllocationKind" NOT NULL,
    "menu_item_name_snapshot" TEXT NOT NULL,
    "unit_price_minor" INTEGER NOT NULL,
    "ordering_cutoff_at" TIMESTAMPTZ(6) NOT NULL,
    "cancellation_cutoff_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "replaces_order_item_id" UUID,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "subscription_id" UUID,
    "meal_type_id" UUID NOT NULL,
    "issued_quantity" INTEGER NOT NULL,
    "available_quantity" INTEGER NOT NULL,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prepaid_reservations" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "entitlement_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "reserved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(6),
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "prepaid_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_effects" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "entitlement_id" UUID NOT NULL,
    "prepaid_reservation_id" UUID,
    "order_item_id" UUID,
    "type" "EntitlementEffectType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "effect_key" TEXT NOT NULL,
    "reason" TEXT,
    "created_by_user_id" UUID,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlement_effects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_capacity_periods" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "subscription_item_id" UUID NOT NULL,
    "meal_type_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "capacity_quantity" INTEGER NOT NULL,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "consumed_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_capacity_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_reservations" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "capacity_period_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "reserved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(6),
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "capacity_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_effects" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "capacity_reservation_id" UUID NOT NULL,
    "capacity_period_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "type" "CapacityEffectType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "effect_key" TEXT NOT NULL,
    "reason" TEXT,
    "created_by_user_id" UUID,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capacity_effects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_events" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "effect_key" TEXT NOT NULL,
    "reason" TEXT,
    "created_by_user_id" UUID,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT,
    "reverses_ledger_entry_id" UUID,
    "invoice_id" UUID,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_minor" INTEGER NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'POSTED',
    "charge_due_at" TIMESTAMPTZ(6) NOT NULL,
    "posted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversed_at" TIMESTAMPTZ(6),
    "ledger_entry_id" UUID NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "subscription_id" UUID,
    "amount_minor" INTEGER NOT NULL,
    "payment_date" TIMESTAMPTZ(6) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "recorded_by_user_id" UUID,
    "ledger_entry_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_applications" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "subscription_id" UUID,
    "amount_minor" INTEGER NOT NULL,
    "released_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_adjustments" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "created_by_user_id" UUID,
    "ledger_entry_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal_minor" INTEGER NOT NULL,
    "previous_balance_minor" INTEGER NOT NULL,
    "payments_minor" INTEGER NOT NULL,
    "credits_minor" INTEGER NOT NULL,
    "outstanding_minor" INTEGER NOT NULL,
    "issued_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "charge_id" UUID NOT NULL,
    "order_item_id" UUID,
    "description" TEXT NOT NULL,
    "meal_type_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_minor" INTEGER NOT NULL,
    "total_minor" INTEGER NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "closure_days" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "closure_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ClosureStatus" NOT NULL DEFAULT 'DRAFT',
    "processed_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "closure_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "closure_effects" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "closure_day_id" UUID NOT NULL,
    "order_item_id" UUID,
    "effect_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "closure_effects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "customer_id" UUID,
    "operation" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL,
    "response_code" INTEGER,
    "response_body" JSONB,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_business_id_role_status_idx" ON "users"("business_id", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_business_id_id_key" ON "users"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "customers"("user_id");

-- CreateIndex
CREATE INDEX "customers_business_id_status_idx" ON "customers"("business_id", "status");

-- CreateIndex
CREATE INDEX "customers_business_id_name_idx" ON "customers"("business_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_business_id_id_key" ON "customers"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_business_id_normalized_phone_key" ON "customers"("business_id", "normalized_phone");

-- CreateIndex
CREATE UNIQUE INDEX "business_settings_business_id_setting_key_key" ON "business_settings"("business_id", "setting_key");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "admin_sessions_user_id_expires_at_idx" ON "admin_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_sessions_token_hash_key" ON "customer_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "customer_sessions_customer_id_expires_at_idx" ON "customer_sessions"("customer_id", "expires_at");

-- CreateIndex
CREATE INDEX "login_attempts_email_occurred_at_idx" ON "login_attempts"("email", "occurred_at");

-- CreateIndex
CREATE INDEX "rate_limit_events_scope_key_hash_occurred_at_idx" ON "rate_limit_events"("scope", "key_hash", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_business_id_entity_type_entity_id_idx" ON "audit_logs"("business_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_business_id_created_at_idx" ON "audit_logs"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "meal_types_business_id_status_sort_order_idx" ON "meal_types"("business_id", "status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "meal_types_business_id_id_key" ON "meal_types"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_types_business_id_code_key" ON "meal_types"("business_id", "code");

-- CreateIndex
CREATE INDEX "plan_templates_business_id_active_type_idx" ON "plan_templates"("business_id", "active", "type");

-- CreateIndex
CREATE UNIQUE INDEX "plan_templates_business_id_id_key" ON "plan_templates"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_templates_business_id_name_key" ON "plan_templates"("business_id", "name");

-- CreateIndex
CREATE INDEX "plan_template_items_business_id_plan_template_id_idx" ON "plan_template_items"("business_id", "plan_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_template_items_business_id_id_key" ON "plan_template_items"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_template_items_plan_template_id_meal_type_id_key" ON "plan_template_items"("plan_template_id", "meal_type_id");

-- CreateIndex
CREATE INDEX "subscriptions_business_id_customer_id_status_idx" ON "subscriptions"("business_id", "customer_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_business_id_start_date_end_date_idx" ON "subscriptions"("business_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_business_id_id_key" ON "subscriptions"("business_id", "id");

-- CreateIndex
CREATE INDEX "subscription_items_business_id_subscription_id_idx" ON "subscription_items"("business_id", "subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_items_business_id_id_key" ON "subscription_items"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_items_subscription_id_meal_type_id_key" ON "subscription_items"("subscription_id", "meal_type_id");

-- CreateIndex
CREATE INDEX "prices_business_id_meal_type_id_effective_from_effective_to_idx" ON "prices"("business_id", "meal_type_id", "effective_from", "effective_to");

-- CreateIndex
CREATE UNIQUE INDEX "prices_business_id_id_key" ON "prices"("business_id", "id");

-- CreateIndex
CREATE INDEX "menus_business_id_menu_date_status_idx" ON "menus"("business_id", "menu_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "menus_business_id_id_key" ON "menus"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "menus_business_id_menu_date_key" ON "menus"("business_id", "menu_date");

-- CreateIndex
CREATE INDEX "menu_items_business_id_menu_id_idx" ON "menu_items"("business_id", "menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_business_id_id_key" ON "menu_items"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_menu_id_meal_type_id_key" ON "menu_items"("menu_id", "meal_type_id");

-- CreateIndex
CREATE INDEX "orders_business_id_customer_id_service_date_idx" ON "orders"("business_id", "customer_id", "service_date");

-- CreateIndex
CREATE INDEX "orders_business_id_service_date_source_idx" ON "orders"("business_id", "service_date", "source");

-- CreateIndex
CREATE UNIQUE INDEX "orders_business_id_id_key" ON "orders"("business_id", "id");

-- CreateIndex
CREATE INDEX "order_items_business_id_service_date_status_idx" ON "order_items"("business_id", "service_date", "status");

-- CreateIndex
CREATE INDEX "order_items_business_id_cancellation_cutoff_at_status_idx" ON "order_items"("business_id", "cancellation_cutoff_at", "status");

-- CreateIndex
CREATE INDEX "order_items_business_id_customer_id_service_date_meal_type__idx" ON "order_items"("business_id", "customer_id", "service_date", "meal_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_business_id_id_key" ON "order_items"("business_id", "id");

-- CreateIndex
CREATE INDEX "entitlements_business_id_customer_id_meal_type_id_created_a_idx" ON "entitlements"("business_id", "customer_id", "meal_type_id", "created_at");

-- CreateIndex
CREATE INDEX "entitlements_business_id_customer_id_meal_type_id_available_idx" ON "entitlements"("business_id", "customer_id", "meal_type_id", "available_quantity");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_business_id_id_key" ON "entitlements"("business_id", "id");

-- CreateIndex
CREATE INDEX "prepaid_reservations_business_id_order_item_id_status_idx" ON "prepaid_reservations"("business_id", "order_item_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "prepaid_reservations_business_id_id_key" ON "prepaid_reservations"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "prepaid_reservations_business_id_entitlement_id_order_item__key" ON "prepaid_reservations"("business_id", "entitlement_id", "order_item_id");

-- CreateIndex
CREATE INDEX "entitlement_effects_business_id_entitlement_id_occurred_at_idx" ON "entitlement_effects"("business_id", "entitlement_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_effects_business_id_id_key" ON "entitlement_effects"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_effects_business_id_effect_key_key" ON "entitlement_effects"("business_id", "effect_key");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_effects_prepaid_reservation_id_type_key" ON "entitlement_effects"("prepaid_reservation_id", "type");

-- CreateIndex
CREATE INDEX "subscription_capacity_periods_business_id_subscription_id_m_idx" ON "subscription_capacity_periods"("business_id", "subscription_id", "meal_type_id", "period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_capacity_periods_business_id_id_key" ON "subscription_capacity_periods"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_capacity_periods_business_id_subscription_item_key" ON "subscription_capacity_periods"("business_id", "subscription_item_id", "period_start");

-- CreateIndex
CREATE INDEX "capacity_reservations_business_id_capacity_period_id_status_idx" ON "capacity_reservations"("business_id", "capacity_period_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_reservations_business_id_id_key" ON "capacity_reservations"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_reservations_business_id_order_item_id_key" ON "capacity_reservations"("business_id", "order_item_id");

-- CreateIndex
CREATE INDEX "capacity_effects_business_id_capacity_period_id_occurred_at_idx" ON "capacity_effects"("business_id", "capacity_period_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_effects_business_id_id_key" ON "capacity_effects"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_effects_business_id_effect_key_key" ON "capacity_effects"("business_id", "effect_key");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_effects_capacity_reservation_id_type_key" ON "capacity_effects"("capacity_reservation_id", "type");

-- CreateIndex
CREATE INDEX "order_item_events_business_id_order_item_id_occurred_at_idx" ON "order_item_events"("business_id", "order_item_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_events_business_id_id_key" ON "order_item_events"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_events_business_id_effect_key_key" ON "order_item_events"("business_id", "effect_key");

-- CreateIndex
CREATE INDEX "ledger_entries_business_id_customer_id_created_at_idx" ON "ledger_entries"("business_id", "customer_id", "created_at");

-- CreateIndex
CREATE INDEX "ledger_entries_business_id_invoice_id_idx" ON "ledger_entries"("business_id", "invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_business_id_id_key" ON "ledger_entries"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "charges_ledger_entry_id_key" ON "charges"("ledger_entry_id");

-- CreateIndex
CREATE INDEX "charges_business_id_customer_id_status_charge_due_at_idx" ON "charges"("business_id", "customer_id", "status", "charge_due_at");

-- CreateIndex
CREATE INDEX "charges_business_id_charge_due_at_status_idx" ON "charges"("business_id", "charge_due_at", "status");

-- CreateIndex
CREATE UNIQUE INDEX "charges_business_id_id_key" ON "charges"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "charges_business_id_order_item_id_key" ON "charges"("business_id", "order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_ledger_entry_id_key" ON "payments"("ledger_entry_id");

-- CreateIndex
CREATE INDEX "payments_business_id_customer_id_payment_date_idx" ON "payments"("business_id", "customer_id", "payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "payments_business_id_id_key" ON "payments"("business_id", "id");

-- CreateIndex
CREATE INDEX "payment_applications_business_id_customer_id_subscription_i_idx" ON "payment_applications"("business_id", "customer_id", "subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_applications_business_id_id_key" ON "payment_applications"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_adjustments_ledger_entry_id_key" ON "financial_adjustments"("ledger_entry_id");

-- CreateIndex
CREATE INDEX "financial_adjustments_business_id_customer_id_created_at_idx" ON "financial_adjustments"("business_id", "customer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "financial_adjustments_business_id_id_key" ON "financial_adjustments"("business_id", "id");

-- CreateIndex
CREATE INDEX "invoices_business_id_customer_id_period_start_period_end_idx" ON "invoices"("business_id", "customer_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "invoices_business_id_status_issued_at_idx" ON "invoices"("business_id", "status", "issued_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_business_id_id_key" ON "invoices"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_business_id_invoice_number_key" ON "invoices"("business_id", "invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_items_charge_id_key" ON "invoice_items"("charge_id");

-- CreateIndex
CREATE INDEX "invoice_items_business_id_invoice_id_idx" ON "invoice_items"("business_id", "invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_items_business_id_id_key" ON "invoice_items"("business_id", "id");

-- CreateIndex
CREATE INDEX "closure_days_business_id_closure_date_status_idx" ON "closure_days"("business_id", "closure_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "closure_days_business_id_id_key" ON "closure_days"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "closure_days_business_id_closure_date_key" ON "closure_days"("business_id", "closure_date");

-- CreateIndex
CREATE INDEX "closure_effects_business_id_closure_day_id_idx" ON "closure_effects"("business_id", "closure_day_id");

-- CreateIndex
CREATE UNIQUE INDEX "closure_effects_business_id_id_key" ON "closure_effects"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "closure_effects_business_id_closure_day_id_effect_key_key" ON "closure_effects"("business_id", "closure_day_id", "effect_key");

-- CreateIndex
CREATE INDEX "idempotency_keys_business_id_created_at_idx" ON "idempotency_keys"("business_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_business_id_operation_key_key" ON "idempotency_keys"("business_id", "operation", "key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_types" ADD CONSTRAINT "meal_types_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_templates" ADD CONSTRAINT "plan_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_template_items" ADD CONSTRAINT "plan_template_items_plan_template_id_fkey" FOREIGN KEY ("plan_template_id") REFERENCES "plan_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_template_items" ADD CONSTRAINT "plan_template_items_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_template_id_fkey" FOREIGN KEY ("plan_template_id") REFERENCES "plan_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_replaces_order_item_id_fkey" FOREIGN KEY ("replaces_order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prepaid_reservations" ADD CONSTRAINT "prepaid_reservations_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "entitlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prepaid_reservations" ADD CONSTRAINT "prepaid_reservations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_effects" ADD CONSTRAINT "entitlement_effects_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "entitlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_effects" ADD CONSTRAINT "entitlement_effects_prepaid_reservation_id_fkey" FOREIGN KEY ("prepaid_reservation_id") REFERENCES "prepaid_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_effects" ADD CONSTRAINT "entitlement_effects_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_capacity_periods" ADD CONSTRAINT "subscription_capacity_periods_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_capacity_periods" ADD CONSTRAINT "subscription_capacity_periods_subscription_item_id_fkey" FOREIGN KEY ("subscription_item_id") REFERENCES "subscription_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_capacity_periods" ADD CONSTRAINT "subscription_capacity_periods_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_reservations" ADD CONSTRAINT "capacity_reservations_capacity_period_id_fkey" FOREIGN KEY ("capacity_period_id") REFERENCES "subscription_capacity_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_reservations" ADD CONSTRAINT "capacity_reservations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_effects" ADD CONSTRAINT "capacity_effects_capacity_reservation_id_fkey" FOREIGN KEY ("capacity_reservation_id") REFERENCES "capacity_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_effects" ADD CONSTRAINT "capacity_effects_capacity_period_id_fkey" FOREIGN KEY ("capacity_period_id") REFERENCES "subscription_capacity_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_effects" ADD CONSTRAINT "capacity_effects_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_events" ADD CONSTRAINT "order_item_events_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_reverses_ledger_entry_id_fkey" FOREIGN KEY ("reverses_ledger_entry_id") REFERENCES "ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closure_days" ADD CONSTRAINT "closure_days_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closure_effects" ADD CONSTRAINT "closure_effects_closure_day_id_fkey" FOREIGN KEY ("closure_day_id") REFERENCES "closure_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closure_effects" ADD CONSTRAINT "closure_effects_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


