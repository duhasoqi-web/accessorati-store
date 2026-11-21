begin;
alter table public.categories add column if not exists image_url text;
alter table public.store_settings add column if not exists footer jsonb not null default '{}'::jsonb;
notify pgrst, 'reload schema';
commit;
