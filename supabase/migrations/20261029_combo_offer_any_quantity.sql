-- Allow customers to purchase one or two perfumes while preserving bundle pricing for complete groups.
update public.combo_offers
set min_quantity = 1,
    updated_at = now()
where slug = 'choose-any-3';
