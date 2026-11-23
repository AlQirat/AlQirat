-- Attar collection: allow 'attar' as a products.collection value (managed from Admin > Attar, shown at /attars).
-- The original check constraints only allowed 'special-edition' and 'gift-set', so replace them.
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'c'
      and conrelid in ('public.products'::regclass, 'public.categories'::regclass)
      and pg_get_constraintdef(oid) ilike '%collection%'
  loop
    execute format('alter table %s drop constraint %I', constraint_record.table_name, constraint_record.conname);
  end loop;
end $$;

alter table public.products
  add constraint products_collection_check
  check (collection is null or collection in ('special-edition', 'gift-set', 'attar'));

alter table public.categories
  add constraint categories_collection_check
  check (collection is null or collection in ('special-edition', 'gift-set', 'attar'));

notify pgrst, 'reload schema';
