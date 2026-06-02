create table if not exists public.tailor_app_state (
  owner_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, key)
);

alter table public.tailor_app_state enable row level security;

drop policy if exists "Tailor users can read their own data" on public.tailor_app_state;
create policy "Tailor users can read their own data"
on public.tailor_app_state
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Tailor users can insert their own data" on public.tailor_app_state;
create policy "Tailor users can insert their own data"
on public.tailor_app_state
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Tailor users can update their own data" on public.tailor_app_state;
create policy "Tailor users can update their own data"
on public.tailor_app_state
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Tailor users can delete their own data" on public.tailor_app_state;
create policy "Tailor users can delete their own data"
on public.tailor_app_state
for delete
to authenticated
using (auth.uid() = owner_id);
