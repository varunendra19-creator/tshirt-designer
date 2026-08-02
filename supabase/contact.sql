-- Task 7: contact form submissions. Server-only (service role); no public read.
create table if not exists contact_messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name       text,
  email      text,
  subject    text,
  message    text,
  handled    boolean default false
);
alter table contact_messages enable row level security;  -- no policies → only the service role (admin API) can touch it
