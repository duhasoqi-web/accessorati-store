begin;
create or replace function public.update_order_status(p_id uuid,p_status text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare o public.orders; x record;
begin
 select * into o from public.orders where id=p_id for update;
 if not found then raise exception 'Order not found'; end if;
 if p_status is null then raise exception 'Invalid status'; end if;
 if o.status=p_status then return jsonb_build_object('ok',true); end if;
 if not ((o.status='جديد' and p_status in ('قيد التجهيز','ملغي')) or (o.status='قيد التجهيز' and p_status in ('تم الشحن','ملغي')) or (o.status='تم الشحن' and p_status in ('تم التسليم','ملغي'))) then raise exception 'Invalid transition'; end if;
 if p_status='ملغي' then
  for x in select product_id,quantity from public.order_items where order_id=p_id order by product_id loop
   update public.products set stock=stock+x.quantity where id=x.product_id;
  end loop;
 end if;
 update public.orders set status=p_status where id=p_id;
 return jsonb_build_object('ok',true);
end; $$;
commit;
