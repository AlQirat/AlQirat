-- Ensure Shop Catalog products in combo_offer_products use their actual Shop catalog price,
-- while dedicated combo-only products (show_in_shop = false) retain their created combo bottle price.

update public.combo_offer_products as cop
set unit_price = p.price,
    updated_at = now()
from public.products as p
where cop.product_id = p.id
  and p.show_in_shop is not false
  and cop.unit_price <> p.price;
