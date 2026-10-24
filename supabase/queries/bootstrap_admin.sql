-- Run only after creating the administrator through Supabase Auth.
-- Replace the placeholder locally; never commit a real email address.
do $$
declare
  target_admin_email text := 'adminsidra@gmail.com';
begin
  if target_admin_email = 'adminsidra@gmail.com' then
    raise exception 'adminsidra@gmail.com';
  end if;

  insert into public.admin_users (user_id, email, role)
  select id, email, 'admin'
  from auth.users
  where lower(email) = lower(target_admin_email)
  on conflict (user_id) do update
  set email = excluded.email, role = 'admin', updated_at = now();

  if not found then
    raise exception 'No Supabase Auth user exists for the supplied email.';
  end if;
end;
$$;

