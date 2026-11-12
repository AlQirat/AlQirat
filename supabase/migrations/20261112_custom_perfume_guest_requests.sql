-- Allow the public custom perfume enquiry form to accept guest submissions.
-- Legacy columns remain available for existing requests, but new submissions only write the four public fields.
alter table public.custom_perfume_requests
  alter column auth_user_id drop not null,
  alter column fragrance_notes drop not null,
  alter column scent_preferences drop not null,
  alter column bottle_size set default 50,
  alter column bottle_size drop not null,
  alter column budget drop not null,
  alter column contact_name set default 'Guest',
  alter column profile_acknowledged set default true;

revoke all on public.custom_perfume_requests from anon, authenticated;
grant select on public.custom_perfume_requests to authenticated;
grant insert (id, reference_brand, reference_name, contact_email, contact_phone) on public.custom_perfume_requests to anon, authenticated;
grant all on public.custom_perfume_requests to service_role;

drop policy if exists "Customers submit own scent requests" on public.custom_perfume_requests;
drop policy if exists "Customers and guests submit scent requests" on public.custom_perfume_requests;
create policy "Customers and guests submit scent requests" on public.custom_perfume_requests
  for insert to anon, authenticated
  with check (
    (auth.uid() is null and auth_user_id is null)
    or (auth.uid() is not null and auth_user_id = auth.uid())
  );

notify pgrst, 'reload schema';
