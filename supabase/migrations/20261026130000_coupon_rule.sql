-- The checkout keeps an applied coupon's rule so the discount follows the bag as quantities change;
-- place_order still re-checks the code and the total. Valid quotes now also return the rule.

set role postgres;

create or replace function public.coupon_quote(p_code text, p_subtotal integer, p_phone text, p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons;
  v_discount integer;
begin
  select * into c from public.coupons where code = upper(btrim(p_code));
  if not found or not c.active then
    return jsonb_build_object('valid', false, 'reason', 'INVALID');
  end if;
  if c.start_date is not null and c.start_date > now() then
    return jsonb_build_object('valid', false, 'reason', 'NOT_STARTED');
  end if;
  if c.end_date is not null and c.end_date < now() then
    return jsonb_build_object('valid', false, 'reason', 'EXPIRED');
  end if;
  if c.usage_limit is not null and c.usage_count >= c.usage_limit then
    return jsonb_build_object('valid', false, 'reason', 'USED_UP');
  end if;
  if c.one_use_per_customer and (
       (p_phone is not null and p_phone = any(c.used_by)) or
       (p_user is not null and ('uid:' || p_user::text) = any(c.used_by))
     ) then
    return jsonb_build_object('valid', false, 'reason', 'ALREADY_USED');
  end if;
  if p_subtotal < c.min_order_amount then
    return jsonb_build_object('valid', false, 'reason', 'MIN_ORDER', 'minOrderAmount', c.min_order_amount);
  end if;
  if c.discount_type = 'percentage' then
    v_discount := round(p_subtotal * c.discount_value / 100.0);
  else
    v_discount := c.discount_value;
  end if;
  return jsonb_build_object(
    'valid', true,
    'code', c.code,
    'discount', least(v_discount, p_subtotal),
    'freeShipping', c.free_shipping,
    'discountType', c.discount_type,
    'discountValue', c.discount_value,
    'minOrderAmount', c.min_order_amount
  );
end;
$$;

notify pgrst, 'reload schema';
