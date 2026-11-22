-- Apply the combo offer's default_unit_price uniformly to all combo_offer_products
-- so both existing Shop Catalog products and newly created Combo-Only products share a consistent single-bottle price on /combos.

update public.combo_offer_products as cop
set unit_price = co.default_unit_price,
    updated_at = now()
from public.combo_offers as co
where cop.offer_id = co.id
  and cop.unit_price <> co.default_unit_price;
