-- Newsletter sign-ups from the storefront. Written and read only through the server (service role),
-- so row level security is on with no public policies.
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists subscribers_email_lower_idx on public.subscribers (lower(email));

alter table public.subscribers enable row level security;

drop policy if exists "Admins manage subscribers" on public.subscribers;
create policy "Admins manage subscribers" on public.subscribers
for all to authenticated using (public.is_admin()) with check (public.is_admin());
