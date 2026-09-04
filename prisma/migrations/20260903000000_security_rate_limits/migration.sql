-- Persistent request-rate-limit events. The application prunes by time window
-- when checking a bucket; this keeps the limiter compatible with multiple
-- server instances without relying on process-local memory.
CREATE TABLE "rate_limit_events" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rate_limit_events_scope_key_hash_occurred_at_idx"
  ON "rate_limit_events"("scope", "key_hash", "occurred_at");
