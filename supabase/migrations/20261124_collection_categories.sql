-- Shows Attars, Special Edition, Gift Sets and Combos as categories (Admin > Categories, Shop menu, homepage
-- "Shop by Category"). Each one redirects to its own page via categories.redirect_url instead of /shop?category=.
-- Edit the image, text or link anytime under Admin > Categories. Existing rows are left untouched.
insert into public.categories (name, slug, description, image_url, redirect_url, sort_order, is_active)
select v.name, v.slug, v.description, v.image_url, v.redirect_url, v.sort_order, true
from (values
  ('Attars',          'attars',          'Pure, Traditional & Long Lasting',       '/images/home/category-attars.jpg',           '/attars',           2),
  ('Special Edition', 'special-edition', 'Exclusive Scents for True Connoisseurs', '/images/home/category-special-editions.jpg', '/special-editions',  3),
  ('Gift Sets',       'gift-sets',       'Perfect for Every Occasion',             '/images/home/category-gift-sets.jpg',        '/gift-sets',        4),
  ('Combos',          'combos',          'Pick your favourites and save',          '/images/home/category-gift-sets.jpg',        '/combos',           5)
) as v(name, slug, description, image_url, redirect_url, sort_order)
where not exists (
  select 1 from public.categories c where c.slug = v.slug or lower(c.name) = lower(v.name)
);

notify pgrst, 'reload schema';
