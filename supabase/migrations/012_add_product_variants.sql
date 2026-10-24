-- Add variants column to products table for size/price variants
alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb;

-- Add check constraint for variants structure
alter table public.products add constraint valid_variants check (
  variants is null or variants = '[]'::jsonb or (
    jsonb_typeof(variants) = 'array' and
    jsonb_array_length(variants) >= 0 and
    variants @> '[]'::jsonb
  )
);

comment on column public.products.variants is 'Product variants (e.g., size/price options): [{"size": "6ml", "price": 249, "stock": 100}, {"size": "12ml", "price": 399, "stock": 50}]';