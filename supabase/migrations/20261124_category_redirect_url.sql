-- Optional manual redirect link per category (Admin > Categories). When set, the Shop menu and the homepage
-- category cards send customers to this link instead of /shop?category=<slug>. NULL keeps the default behaviour.
alter table public.categories
  add column if not exists redirect_url text
  check (redirect_url is null or char_length(redirect_url) <= 500);

notify pgrst, 'reload schema';
