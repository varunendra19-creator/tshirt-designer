-- Task 5: payments (Stripe). Only stores Stripe *reference ids* — never card data.

-- Webhook idempotency: each Stripe event is processed at most once.
create table if not exists processed_webhooks (
  event_id   text primary key,
  type       text,
  created_at timestamptz default now()
);
alter table processed_webhooks enable row level security;  -- server-only (service role)

-- Correlate a Stripe Checkout Session with its order (payment_intent lives in orders.payment_ref).
alter table orders
  add column if not exists stripe_session_id text,
  add column if not exists refund_id text;             -- Stripe refund id (when refunded via gateway)
