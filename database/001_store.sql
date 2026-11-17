-- Run once through Supabase migrations. Prices are integer agorot (100 = 1 ILS).
begin;
create table public.categories(id uuid primary key default gen_random_uuid(),name text not null unique check(length(name) between 1 and 60));
create table public.products(id uuid primary key default gen_random_uuid(),category_id uuid not null references public.categories(id),name text not null check(length(name) between 1 and 120),description text not null default '' check(length(description)<=2000),price integer not null check(price between 1 and 10000000),stock integer not null check(stock between 0 and 100000),image_url text not null,active boolean not null default true,is_demo boolean not null default false,created_at timestamptz not null default now());
create index products_category_idx on public.products(category_id);
create table public.store_settings(id integer primary key check(id=1),shipping_fee integer not null default 2000 check(shipping_fee between 0 and 100000),accepting_orders boolean not null default false,contact_phone text not null default '',delivery_note text not null default 'رسوم التوصيل موحدة، ويُرجى تحديد العنوان بالتفصيل.');
create table public.orders(id uuid primary key default gen_random_uuid(),request_key uuid not null unique,customer_name text not null check(length(customer_name) between 1 and 100),phone text not null check(length(phone) between 8 and 25),address text not null check(length(address) between 1 and 400),notes text not null default '' check(length(notes)<=500),subtotal bigint not null,shipping_fee integer not null,total bigint not null,status text not null default 'جديد' check(status in ('جديد','قيد التجهيز','تم الشحن','تم التسليم','ملغي')),created_at timestamptz not null default now());
create index orders_created_idx on public.orders(created_at desc);
create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),product_id uuid not null references public.products(id),name text not null,price integer not null,quantity integer not null check(quantity between 1 and 20));
create index order_items_order_idx on public.order_items(order_id);
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
-- Browser anonymous/authenticated roles have no data access. Only the .NET server holds service_role.
revoke all on public.categories,public.products,public.store_settings,public.orders,public.order_items from anon,authenticated;
grant all on public.categories,public.products,public.store_settings,public.orders,public.order_items to service_role;
create function public.place_order(p_key uuid,p_name text,p_phone text,p_address text,p_notes text,p_items jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare cfg public.store_settings; p public.products; x record; oid uuid; amount bigint:=0; previous public.orders; n integer;
begin
 if p_key is null or p_name is null or length(trim(p_name)) not between 1 and 100 or p_phone is null or length(p_phone) not between 8 and 25 or p_address is null or length(trim(p_address)) not between 1 and 400 or length(coalesce(p_notes,''))>500 or p_items is null or jsonb_typeof(p_items)!='array' then raise exception 'Invalid order'; end if;
 if jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Invalid item count'; end if;
 -- Serialize identical idempotency keys before checking; retries never reserve twice.
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
 select * into previous from public.orders where request_key=p_key;
 if found then return jsonb_build_object('id',previous.id,'total',previous.total,'status',previous.status); end if;
 select * into cfg from public.store_settings where id=1;
 if not found or not cfg.accepting_orders then raise exception 'Store is closed'; end if;
 select count(distinct a.product_id) into n from jsonb_to_recordset(p_items) as a(product_id uuid,quantity integer);
 if n!=jsonb_array_length(p_items) then raise exception 'Duplicate items'; end if;
 -- Deterministic locking prevents concurrent customers from overselling stock.
 for x in select * from jsonb_to_recordset(p_items) as a(product_id uuid,quantity integer) order by product_id loop
  if x.quantity is null or x.quantity not between 1 and 20 then raise exception 'Invalid quantity'; end if;
  select * into p from public.products where id=x.product_id for update;
  if not found or not p.active or p.is_demo or p.stock<x.quantity then raise exception 'Unavailable item'; end if;
  amount:=amount+p.price::bigint*x.quantity;
 end loop;
 insert into public.orders(request_key,customer_name,phone,address,notes,subtotal,shipping_fee,total) values(p_key,trim(p_name),trim(p_phone),trim(p_address),coalesce(p_notes,''),amount,cfg.shipping_fee,amount+cfg.shipping_fee) returning id into oid;
 for x in select * from jsonb_to_recordset(p_items) as a(product_id uuid,quantity integer) order by product_id loop
  select * into p from public.products where id=x.product_id;
  insert into public.order_items(order_id,product_id,name,price,quantity) values(oid,p.id,p.name,p.price,x.quantity);
  update public.products set stock=stock-x.quantity where id=p.id;
 end loop;
 return jsonb_build_object('id',oid,'total',amount+cfg.shipping_fee,'status','جديد');
end; $$;
create function public.update_order_status(p_id uuid,p_status text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare o public.orders; x record;
begin
 select * into o from public.orders where id=p_id for update;
 if not found then raise exception 'Order not found'; end if;
 if p_status is null then raise exception 'Invalid status'; end if;
 if o.status=p_status then return jsonb_build_object('ok',true); end if;
 if not ((o.status='جديد' and p_status in ('قيد التجهيز','ملغي')) or (o.status='قيد التجهيز' and p_status in ('تم الشحن','ملغي')) or (o.status='تم الشحن' and p_status='تم التسليم')) then raise exception 'Invalid transition'; end if;
 if p_status='ملغي' then
  for x in select product_id,quantity from public.order_items where order_id=p_id order by product_id loop
   update public.products set stock=stock+x.quantity where id=x.product_id;
  end loop;
 end if;
 update public.orders set status=p_status where id=p_id;
 return jsonb_build_object('ok',true);
end; $$;
revoke execute on function public.place_order(uuid,text,text,text,text,jsonb),public.update_order_status(uuid,text) from public,anon,authenticated;
grant execute on function public.place_order(uuid,text,text,text,text,jsonb),public.update_order_status(uuid,text) to service_role;
insert into public.categories(id,name) values('00000000-0000-0000-0000-000000000001','مكياج'),('00000000-0000-0000-0000-000000000002','عناية بالبشرة'),('00000000-0000-0000-0000-000000000003','عطور'),('00000000-0000-0000-0000-000000000004','إكسسوارات');
insert into public.store_settings(id) values(1);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('products','products',true,5000000,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
commit;
