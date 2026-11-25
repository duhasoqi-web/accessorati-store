alter table public.products add column original_price integer check (original_price > price and original_price <= 10000000);
