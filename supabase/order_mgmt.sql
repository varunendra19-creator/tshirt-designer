-- Task 3c: order management — payment status, shipping/tracking, cancel, refund + audit timeline.

-- Two-axis order state:
--   status         (fulfilment): pending | processing | shipped | delivered | cancelled
--   payment_status (money):      unpaid  | paid | partially_refunded | refunded | failed
alter table orders
  add column if not exists payment_status text default 'unpaid',
  add column if not exists carrier         text,
  add column if not exists tracking_no     text,
  add column if not exists tracking_url    text,
  add column if not exists shipped_at      timestamptz,
  add column if not exists delivered_at    timestamptz,
  add column if not exists cancelled_at    timestamptz,
  add column if not exists cancel_reason   text,
  add column if not exists refund_amount   integer default 0,
  add column if not exists refunded_at     timestamptz,
  add column if not exists refund_reason   text,
  add column if not exists admin_note      text,
  add column if not exists payment_ref     text,          -- stripe payment_intent / txn ref (task 5)
  add column if not exists stock_restored  boolean default false;

-- Backfill existing rows onto the two-axis model.
update orders set payment_status = 'paid'   where status = 'paid'    and (payment_status is null or payment_status = 'unpaid');
update orders set status = 'processing'       where status = 'paid';
update orders set payment_status = 'paid'   where status = 'shipped' and (payment_status is null or payment_status = 'unpaid');
update orders set payment_status = 'unpaid' where payment_status is null;

-- Append-only audit / customer-visible timeline.
create table if not exists order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references orders(id) on delete cascade,
  created_at timestamptz default now(),
  type       text,     -- created | status | payment | shipping | cancel | refund | note
  message    text,
  actor      text      -- admin email, 'system', or 'customer'
);
create index if not exists order_events_order_idx on order_events(order_id, created_at);

alter table order_events enable row level security;
-- Server (service role) bypasses RLS for writes. Customers may read their own order's timeline.
drop policy if exists "own order events readable" on order_events;
create policy "own order events readable" on order_events for select
  using (exists (select 1 from orders o where o.id = order_events.order_id and o.user_id = auth.uid()));
