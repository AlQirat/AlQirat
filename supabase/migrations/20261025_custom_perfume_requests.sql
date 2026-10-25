-- Custom scent enquiries. Customer writes are limited to submission fields;
-- the existing cookie-authorized admin API alone uses the service role.
-- This migration is intentionally safe to re-run from Supabase SQL Editor.
create table if not exists public.custom_perfume_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  homepage_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.custom_perfume_settings (id) values (true)
on conflict (id) do nothing;
alter table public.custom_perfume_settings enable row level security;
revoke all on public.custom_perfume_settings from anon, authenticated;
grant select on public.custom_perfume_settings to anon, authenticated;
grant all on public.custom_perfume_settings to service_role;
drop policy if exists "Public reads scent availability" on public.custom_perfume_settings;
create policy "Public reads scent availability" on public.custom_perfume_settings for select to anon, authenticated using (true);
drop trigger if exists scent_settings_updated on public.custom_perfume_settings;
create trigger scent_settings_updated before update on public.custom_perfume_settings for each row execute function public.set_updated_at();

create table if not exists public.custom_perfume_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reference_brand text not null check (length(trim(reference_brand)) between 1 and 120),
  reference_name text not null check (length(trim(reference_name)) between 1 and 160),
  fragrance_notes text not null check (length(trim(fragrance_notes)) between 3 and 2000),
  scent_preferences text not null check (length(trim(scent_preferences)) between 3 and 2000),
  bottle_size integer not null check (bottle_size in (30, 50, 100)),
  budget numeric(12,2) not null check (budget > 0 and budget <= 1000000),
  reference_url text not null default '' check (length(reference_url) <= 2000 and (reference_url = '' or reference_url ~* '^https?://[^[:space:]]+$')),
  contact_name text not null check (length(trim(contact_name)) between 2 and 120),
  contact_email text not null check (length(contact_email) <= 254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  contact_phone text not null check (contact_phone ~ '^[0-9+() -]{7,20}$'),
  instructions text not null default '' check (length(instructions) <= 3000),
  profile_acknowledged boolean not null check (profile_acknowledged),
  status text not null default 'new' check (status in ('new', 'reviewing', 'quoted', 'in_progress', 'completed', 'declined', 'cancelled')),
  quotation_amount numeric(12,2) check (quotation_amount > 0 and quotation_amount <= 1000000),
  quotation_details text not null default '' check (length(quotation_details) <= 3000),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'quoted' or (quotation_amount is not null and length(trim(quotation_details)) > 0))
);
create index if not exists custom_perfume_owner_date on public.custom_perfume_requests(auth_user_id, created_at desc);
create index if not exists custom_perfume_status_date on public.custom_perfume_requests(status, created_at desc);
alter table public.custom_perfume_requests enable row level security;
revoke all on public.custom_perfume_requests from anon, authenticated;
grant select on public.custom_perfume_requests to authenticated;
grant insert (id, reference_brand, reference_name, fragrance_notes, scent_preferences, bottle_size, budget, reference_url, contact_name, contact_email, contact_phone, instructions, profile_acknowledged) on public.custom_perfume_requests to authenticated;
grant all on public.custom_perfume_requests to service_role;
drop policy if exists "Customers read own scent requests" on public.custom_perfume_requests;
create policy "Customers read own scent requests" on public.custom_perfume_requests for select to authenticated using (auth_user_id = auth.uid());
drop policy if exists "Customers submit own scent requests" on public.custom_perfume_requests;
create policy "Customers submit own scent requests" on public.custom_perfume_requests for insert to authenticated with check (auth_user_id = auth.uid());

create or replace function public.check_scent_request_enabled() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize against an admin disabling submissions, including direct REST inserts.
  perform 1 from public.custom_perfume_settings where id = true and enabled for share;
  if not found then raise exception 'Custom perfume requests are currently paused.' using errcode = 'P0001'; end if;
  return new;
end;
$$;
drop trigger if exists scent_request_enabled on public.custom_perfume_requests;
create trigger scent_request_enabled before insert on public.custom_perfume_requests for each row execute function public.check_scent_request_enabled();

create table if not exists public.custom_perfume_internal_notes (
  request_id uuid primary key references public.custom_perfume_requests(id) on delete cascade,
  notes text not null default '' check (length(notes) <= 10000)
);
alter table public.custom_perfume_internal_notes enable row level security;
revoke all on public.custom_perfume_internal_notes from anon, authenticated;
grant all on public.custom_perfume_internal_notes to service_role;

create table if not exists public.custom_perfume_updates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.custom_perfume_requests(id) on delete cascade,
  status text not null,
  quotation_amount numeric(12,2),
  quotation_details text not null,
  created_at timestamptz not null default now()
);
create index if not exists custom_perfume_updates_request on public.custom_perfume_updates(request_id, created_at desc);
alter table public.custom_perfume_updates enable row level security;
revoke all on public.custom_perfume_updates from anon, authenticated;
grant select on public.custom_perfume_updates to authenticated;
grant all on public.custom_perfume_updates to service_role;
drop policy if exists "Customers read own scent updates" on public.custom_perfume_updates;
create policy "Customers read own scent updates" on public.custom_perfume_updates for select to authenticated using (exists (select 1 from public.custom_perfume_requests r where r.id = request_id and r.auth_user_id = auth.uid()));

create or replace function public.record_scent_request_update() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or row(new.status, new.quotation_amount, new.quotation_details) is distinct from row(old.status, old.quotation_amount, old.quotation_details) then
    insert into public.custom_perfume_updates(request_id, status, quotation_amount, quotation_details)
    values (new.id, new.status, new.quotation_amount, new.quotation_details);
  end if;
  return new;
end;
$$;
drop trigger if exists scent_request_updates on public.custom_perfume_requests;
create trigger scent_request_updates after insert or update on public.custom_perfume_requests for each row execute function public.record_scent_request_update();
drop trigger if exists scent_request_updated on public.custom_perfume_requests;
create trigger scent_request_updated before update on public.custom_perfume_requests for each row execute function public.set_updated_at();

-- One transaction for customer-visible changes and confidential notes. Versioning
-- prevents a stale admin tab overwriting another admin's work.
create or replace function public.manage_custom_perfume_request(p_id uuid, p_version integer, p_status text, p_amount numeric, p_details text, p_notes text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.custom_perfume_requests set status = p_status, quotation_amount = p_amount,
    quotation_details = p_details, version = version + 1 where id = p_id and version = p_version;
  if not found then raise exception 'Request changed or no longer exists. Reload before saving.' using errcode = '40001'; end if;
  insert into public.custom_perfume_internal_notes(request_id, notes) values (p_id, p_notes)
    on conflict (request_id) do update set notes = excluded.notes;
end;
$$;
revoke all on function public.manage_custom_perfume_request(uuid, integer, text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.manage_custom_perfume_request(uuid, integer, text, numeric, text, text) to service_role;
revoke all on function public.check_scent_request_enabled() from public, anon, authenticated;
revoke all on function public.record_scent_request_update() from public, anon, authenticated;
notify pgrst, 'reload schema';
