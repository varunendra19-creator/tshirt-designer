-- Task 4c: review moderation.

alter table reviews add column if not exists hidden boolean not null default false;

-- Public sees only visible reviews; authors still see their own (even if hidden by a moderator).
drop policy if exists "reviews readable" on reviews;
create policy "reviews readable" on reviews for select
  using (hidden = false or auth.uid() = user_id);
