-- Task 3d-3: discounts & coupons.

create table if not exists coupons (
  code          text primary key,                 -- stored UPPERCASE
  type          text not null default 'percent',  -- percent | fixed | free_shipping
  value         integer not null default 0,       -- percent (0-100) or fixed INR; ignored for free_shipping
  min_subtotal  integer default 0,                -- minimum cart subtotal (INR) to qualify
  max_discount  integer,                          -- cap for percent discounts (INR); null = uncapped
  starts_at     timestamptz,
  expires_at    timestamptz,
  usage_limit   integer,                          -- total redemptions allowed; null = unlimited
  used_count    integer not null default 0,
  per_user_limit integer,                         -- redemptions per user; null = unlimited
  active        boolean not null default true,
  description   text,
  created_at    timestamptz default now()
);

-- Coupon codes are validated server-side only (service role). No public/anon read policy.
alter table coupons enable row level security;

-- Atomic redeem: increments used_count only while under the limit. Returns the new count, or -1 if exhausted.
create or replace function redeem_coupon(p_code text)
returns integer
language plpgsql
security definer
as $$
declare new_count integer;
begin
  update coupons
     set used_count = used_count + 1
   where code = p_code
     and active = true
     and (usage_limit is null or used_count < usage_limit)
  returning used_count into new_count;
  return coalesce(new_count, -1);
end;
$$;

-- Record the applied coupon + discount on the order.
alter table orders
  add column if not exists coupon_code text,
  add column if not exists discount    integer default 0;
