-- ============================================================================
-- Campus Mode — Supabase schema (Phase 1: orders + design storage)
-- Run this once in your Supabase project:  SQL Editor → paste → Run.
-- ============================================================================

-- ── orders ─────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  order_no       text unique not null,
  status         text not null default 'pending',      -- pending | paid | shipped | cancelled
  -- customer / delivery
  customer_name  text not null,
  phone          text not null,
  email          text,
  address        text not null,
  city           text not null,
  state          text not null,
  pincode        text not null,
  -- payment / money (whole rupees)
  payment_method text not null,                          -- upi | card | cod | razorpay | stripe
  subtotal       integer not null,
  shipping       integer not null default 0,
  total          integer not null,
  -- set once auth (Phase 2) is live, so a customer can see "My Orders"
  user_id        uuid references auth.users(id) on delete set null
);

-- ── order items ─────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       text,
  name             text not null,
  size             text,
  color            text,
  qty              integer not null default 1,
  unit_price       integer not null,
  line_total       integer not null,
  is_custom        boolean not null default false,
  design_image_url text                                   -- Supabase Storage URL for custom designs
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists orders_user_id_idx on public.orders(user_id);

-- ── storage bucket for custom design images (public read) ────────────────────
insert into storage.buckets (id, name, public)
values ('designs', 'designs', true)
on conflict (id) do nothing;

-- Anyone can read design images (they're shown in cart/checkout/order pages)…
drop policy if exists "public read designs" on storage.objects;
create policy "public read designs" on storage.objects
  for select using (bucket_id = 'designs');
-- …but only the server (service-role key) uploads them — no client insert policy.

-- ── row-level security ───────────────────────────────────────────────────────
-- Writes go through the server /api/orders route using the SERVICE ROLE key,
-- which bypasses RLS. Inserts always happen via the server.
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Phase 2: a logged-in customer can READ their own orders (for "My Orders").
drop policy if exists "own orders select" on public.orders;
create policy "own orders select" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "own items select" on public.order_items;
create policy "own items select" on public.order_items
  for select using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.user_id = auth.uid()
  ));
