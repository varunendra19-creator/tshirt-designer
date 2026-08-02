-- Task 8: audit trail for admin mutations (catalogue/coupon/category CRUD, refunds).
-- Order fulfilment changes are already tracked in order_events; this covers the rest.
create table if not exists admin_audit (
  id         bigint generated always as identity primary key,
  created_at timestamptz default now(),
  actor      text,           -- admin email
  action     text,           -- create | update | delete | ...
  entity     text,           -- product | coupon | category | variant | refund | ...
  entity_id  text,
  meta       jsonb
);
alter table admin_audit enable row level security;  -- no policies → service-role (admin API) only
create index if not exists admin_audit_created_idx on admin_audit (created_at desc);
