-- Behaviour checks for the RootLand database (58 checks: orders, stock, coupons, tracking, roles, row level security).
-- Run after the migration and seed INSIDE a transaction that is rolled back, so the test accounts and orders
-- never persist:  begin; <this file>; rollback;   — each row of the final select must have ok = true.

-- Behaviour checks for the RootLand schema. Run after migration + seed inside a transaction that is rolled back.
reset role;
create temp table t_results (n serial, name text, ok boolean, detail text) on commit drop;
grant all on t_results to public;
grant all on sequence t_results_n_seq to public;

-- Test accounts that only exist inside this rolled-back transaction.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rootland.store@gmail.com', now(), '{"full_name":"Owner Test"}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer.test@example.com', now(), '{"full_name":"Customer Test","phone":"01012345678"}', now(), now()),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other.test@example.com', now(), '{"full_name":"Other Test"}', now(), now()),
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'unconfirmed.staff@example.com', null, '{"full_name":"Unconfirmed"}', now(), now());
insert into public.staff (email, role, added_by) values ('unconfirmed.staff@example.com', 'ORDERS', 'test');

do $$
declare
  v jsonb;
  v2 jsonb;
  v_num text;
  v_id uuid;
  v_cust_order uuid;
  n integer;
  r text;
  procedure_ok boolean;
begin
  -- helper to act as someone
  -- anon
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';

  select count(*) into n from public.products;
  insert into t_results(name, ok, detail) values ('anon sees 2 active products', n = 2, n::text);

  select count(*) into n from public.product_variants;
  insert into t_results(name, ok, detail) values ('anon sees 6 sizes', n = 6, n::text);

  select count(*) into n from public.staff;
  insert into t_results(name, ok, detail) values ('anon sees no staff rows', n = 0, n::text);

  select public.my_staff_role() into r;
  insert into t_results(name, ok, detail) values ('anon has no staff role', r is null, coalesce(r, 'null'));

  -- happy path: 2 x black L to Giza = 2500 + 65
  v := public.place_order(
    '[{"variantId":"eh-blk-l","quantity":2,"isPreorder":false}]',
    '{"fullName":"Guest Buyer","phone":"+20 101 234 5678","governorate":"giza","city":"Dokki","streetAddress":"1 Test St"}',
    'Guest@Example.com', 'Call first', '', 'en', 2565);
  v_num := v ->> 'order_number';
  v_id := (v ->> 'id')::uuid;
  insert into t_results(name, ok, detail) values ('guest order placed with server totals',
    (v ->> 'total')::int = 2565 and (v ->> 'subtotal')::int = 2500 and (v ->> 'shipping_fee')::int = 65
      and v ->> 'order_status' = 'pending' and v ->> 'payment_status' = 'cash_on_delivery'
      and v ->> 'customer_phone' = '01012345678' and v ->> 'customer_email' = 'guest@example.com'
      and v_num ~ '^RL-[0-9]{6}-[A-Z2-9]{4}$' and jsonb_array_length(v -> 'order_items') = 1
      and (v -> 'shipping_address' ->> 'governorate') = 'Giza' and (v ->> 'user_id') is null,
    v::text);

  select stock_count into n from public.product_variants where id = 'eh-blk-l';
  insert into t_results(name, ok, detail) values ('stock went down by 2 (18 -> 16)', n = 16, n::text);

  select count(*) into n from public.orders;
  insert into t_results(name, ok, detail) values ('anon cannot read orders', n = 0, n::text);

  -- tracking
  v2 := public.track_order(lower(v_num), '01012345678');
  insert into t_results(name, ok, detail) values ('tracking works with order number + phone',
    v2 ->> 'order_status' = 'pending' and v2 ->> 'first_name' = 'Guest' and not (v2 ? 'shipping_address') and not (v2 ? 'customer_phone'),
    coalesce(v2::text, 'null'));
  v2 := public.track_order(v_num, '01099999999');
  insert into t_results(name, ok, detail) values ('tracking refuses the wrong phone', v2 is null, coalesce(v2::text, 'null'));

  -- free shipping at 3000+: 3 x 1250 = 3750
  v2 := public.place_order('[{"variantId":"eh-blk-xl","quantity":3,"isPreorder":false}]',
    '{"fullName":"Free Ship","phone":"01112345678","governorate":"aswan","city":"Aswan","streetAddress":"2 St"}', '', '', '', 'ar', 3750);
  insert into t_results(name, ok, detail) values ('free shipping from 3000 EGP',
    (v2 ->> 'shipping_fee')::int = 0 and (v2 ->> 'total')::int = 3750 and v2 ->> 'customer_language' = 'ar', v2 ->> 'total');

  -- wrong expected total
  begin
    perform public.place_order('[{"variantId":"eh-wgy-l","quantity":1,"isPreorder":false}]',
      '{"fullName":"X","phone":"01212345678","governorate":"cairo","city":"C","streetAddress":"S"}', '', '', '', 'en', 1000);
    insert into t_results(name, ok, detail) values ('changed total is refused', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('changed total is refused', sqlerrm = 'TOTAL_CHANGED:1064', sqlerrm);
  end;

  -- out of stock
  begin
    perform public.place_order('[{"variantId":"eh-wgy-xl","quantity":6,"isPreorder":false}]',
      '{"fullName":"X","phone":"01212345678","governorate":"cairo","city":"C","streetAddress":"S"}', '', '', '', 'en', 6059);
    insert into t_results(name, ok, detail) values ('out of stock is refused', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('out of stock is refused', sqlerrm like 'OUT_OF_STOCK:%', sqlerrm);
  end;
  select stock_count into n from public.product_variants where id = 'eh-wgy-xl';
  insert into t_results(name, ok, detail) values ('refused order leaves stock untouched (5)', n = 5, n::text);

  -- pre-order of an in-stock size
  begin
    perform public.place_order('[{"variantId":"eh-wgy-l","quantity":1,"isPreorder":true}]',
      '{"fullName":"X","phone":"01212345678","governorate":"cairo","city":"C","streetAddress":"S"}', '', '', '', 'en', 1064);
    insert into t_results(name, ok, detail) values ('pre-order of an in-stock size is refused', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('pre-order of an in-stock size is refused', sqlerrm like 'BACK_IN_STOCK:%', sqlerrm);
  end;

  -- bad phone / governorate / quantity
  begin
    perform public.place_order('[{"variantId":"eh-wgy-l","quantity":1,"isPreorder":false}]',
      '{"fullName":"X","phone":"0131234567","governorate":"cairo","city":"C","streetAddress":"S"}', '', '', '', 'en', 1064);
    insert into t_results(name, ok, detail) values ('invalid phone is refused', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('invalid phone is refused', sqlerrm = 'INVALID_PHONE', sqlerrm);
  end;
  begin
    perform public.place_order('[{"variantId":"eh-wgy-l","quantity":1,"isPreorder":false}]',
      '{"fullName":"X","phone":"01212345678","governorate":"atlantis","city":"C","streetAddress":"S"}', '', '', '', 'en', 1064);
    insert into t_results(name, ok, detail) values ('unknown governorate is refused', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('unknown governorate is refused', sqlerrm = 'INVALID_GOVERNORATE', sqlerrm);
  end;
  begin
    perform public.place_order('[{"variantId":"eh-wgy-l","quantity":0,"isPreorder":false}]',
      '{"fullName":"X","phone":"01212345678","governorate":"cairo","city":"C","streetAddress":"S"}', '', '', '', 'en', 65);
    insert into t_results(name, ok, detail) values ('zero quantity is refused', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('zero quantity is refused', sqlerrm = 'INVALID_QUANTITY', sqlerrm);
  end;

  -- customers cannot call staff functions or write tables directly
  begin
    perform public.update_order_status(v_id, 'cancelled', '');
    insert into t_results(name, ok, detail) values ('anon cannot change order status', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('anon cannot change order status', sqlerrm like 'permission denied%', sqlerrm);
  end;
  begin
    update public.product_variants set stock_count = 999 where id = 'eh-blk-l';
    get diagnostics n = row_count;
    insert into t_results(name, ok, detail) values ('anon cannot edit stock', n = 0, n::text || ' rows');
  exception when others then
    insert into t_results(name, ok, detail) values ('anon cannot edit stock', true, sqlerrm);
  end;
  begin
    insert into public.reviews (product_id, author_name, rating, comment, published) values ('prod-essential-hoodie-black', 'Spam', 5, 'x', true);
    insert into t_results(name, ok, detail) values ('anon cannot publish a review directly', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('anon cannot publish a review directly', true, sqlerrm);
  end;

  -- review submission stays hidden
  perform public.submit_review('prod-essential-hoodie-black', 'Mona', 5, 'Soft and warm', 'L', 'Cairo', 'True to Size');
  select count(*) into n from public.reviews;
  insert into t_results(name, ok, detail) values ('submitted review is hidden from the public', n = 0, n::text);
  begin
    perform public.submit_review('prod-essential-hoodie-black', 'NoFit', 5, 'Soft', 'L', '', null);
    insert into t_results(name, ok, detail) values ('review without a fit vote is refused', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('review without a fit vote is refused', sqlerrm = 'INVALID_FIT_VOTE', sqlerrm);
  end;

  -- B2B
  r := public.submit_b2b_lead('Test Cafe', 'Test Person', 'b2b@example.com', '01000000000', 120, '{"businessType":"Other"}');
  insert into t_results(name, ok, detail) values ('B2B request saved', r ~ '^B2B-[0-9A-F]{8}$', r);
  begin
    perform public.submit_b2b_lead('Tiny', 'P', 'tiny@example.com', '01000000000', 20, '{}');
    insert into t_results(name, ok, detail) values ('B2B under 100 pieces is refused', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('B2B under 100 pieces is refused', true, sqlerrm);
  end;

  -- signed-in customer
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"customer.test@example.com"}', true);
  execute 'set local role authenticated';

  select full_name || '|' || coalesce(phone, '') into r from public.profiles where id = auth.uid();
  insert into t_results(name, ok, detail) values ('sign-up creates a profile from the metadata', r = 'Customer Test|01012345678', coalesce(r, 'null'));

  v2 := public.place_order('[{"variantId":"eh-wgy-l","quantity":1,"isPreorder":false}]',
    '{"fullName":"Customer Test","phone":"01012345678","governorate":"cairo","city":"Maadi","streetAddress":"3 St"}', '', '', '', 'en', 1064);
  v_cust_order := (v2 ->> 'id')::uuid;
  insert into t_results(name, ok, detail) values ('signed-in order is linked to the account', v2 ->> 'user_id' = '00000000-0000-4000-8000-000000000002', v2 ->> 'user_id');

  select count(*) into n from public.orders;
  insert into t_results(name, ok, detail) values ('customer reads only their own orders', n = 1, n::text);
  select count(*) into n from public.order_items;
  insert into t_results(name, ok, detail) values ('customer reads only their own order items', n = 1, n::text);

  update public.profiles set full_name = 'Renamed', email = 'hacker@example.com' where id = auth.uid();
  select full_name || '|' || email into r from public.profiles where id = auth.uid();
  insert into t_results(name, ok, detail) values ('customer edits name but not email', r = 'Renamed|customer.test@example.com', r);

  select count(*) into n from public.profiles;
  insert into t_results(name, ok, detail) values ('customer sees only their own profile', n = 1, n::text);

  select public.my_staff_role() into r;
  insert into t_results(name, ok, detail) values ('customer has no staff role', r is null, coalesce(r, 'null'));

  -- another customer cannot see it
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into n from public.orders;
  insert into t_results(name, ok, detail) values ('other customer sees no orders', n = 0, n::text);

  -- staff email that is not confirmed gets no role
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select public.my_staff_role() into r;
  insert into t_results(name, ok, detail) values ('unconfirmed staff email has no role', r is null, coalesce(r, 'null'));
  select count(*) into n from public.orders;
  insert into t_results(name, ok, detail) values ('unconfirmed staff reads no orders', n = 0, n::text);

  -- owner
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select public.my_staff_role() into r;
  insert into t_results(name, ok, detail) values ('owner gets the OWNER role', r = 'OWNER', coalesce(r, 'null'));

  select count(*) into n from public.orders;
  insert into t_results(name, ok, detail) values ('owner reads all orders', n = 3, n::text);

  v2 := public.update_order_status(v_id, 'cancelled', '');
  select stock_count into n from public.product_variants where id = 'eh-blk-l';
  insert into t_results(name, ok, detail) values ('cancelling returns stock (16 -> 18)', n = 18 and v2 ->> 'order_status' = 'cancelled', n::text);

  v2 := public.update_order_status(v_id, 'refused', '');
  select stock_count into n from public.product_variants where id = 'eh-blk-l';
  insert into t_results(name, ok, detail) values ('stock is returned only once', n = 18, n::text);

  v2 := public.update_order_status(v_id, 'confirmed', 'Reopened');
  select stock_count into n from public.product_variants where id = 'eh-blk-l';
  insert into t_results(name, ok, detail) values ('reopening takes the stock again (18 -> 16)', n = 16 and v2 ->> 'stock_released' = 'false', n::text);

  v2 := public.update_order_status(v_id, 'delivered', '');
  insert into t_results(name, ok, detail) values ('delivered marks cash as collected', v2 ->> 'payment_status' = 'paid' and jsonb_array_length(v2 -> 'timeline') = 5, (v2 ->> 'payment_status') || ' / ' || jsonb_array_length(v2 -> 'timeline'));

  v2 := public.update_order_shipping(v_id, 'Bosta', '123456');
  insert into t_results(name, ok, detail) values ('courier and tracking number saved', v2 ->> 'courier' = 'Bosta' and v2 ->> 'tracking_number' = '123456', v2 ->> 'courier');

  perform public.save_order_internal_notes(v_id, 'VIP');
  select notes into r from public.order_internal_notes where order_id = v_id;
  insert into t_results(name, ok, detail) values ('internal notes saved for staff', r = 'VIP', coalesce(r, 'null'));

  perform public.set_variant_stock('eh-wgy-xxl', 9);
  select stock_count into n from public.product_variants where id = 'eh-wgy-xxl';
  insert into t_results(name, ok, detail) values ('owner sets stock', n = 9, n::text);

  select count(*) into n from public.admin_customers();
  insert into t_results(name, ok, detail) values ('customers list shows all accounts', n = 4, n::text);

  select count(*) into n from public.reviews;
  insert into t_results(name, ok, detail) values ('owner sees the hidden review', n = 1, n::text);
  update public.reviews set published = true;
  select count(*) into n from public.b2b_leads;
  insert into t_results(name, ok, detail) values ('owner sees the B2B request', n = 1, n::text);

  insert into public.coupons (code, discount_type, discount_value, min_order_amount, one_use_per_customer)
  values ('TEST10', 'percentage', 10, 1000, true);

  begin
    update public.settings set data = data - 'governorates' where id = 'store';
    insert into t_results(name, ok, detail) values ('broken store settings are refused', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('broken store settings are refused', sqlerrm like 'SETTINGS_INVALID%', sqlerrm);
  end;
  begin
    update public.settings set data = jsonb_set(data, '{scrollSpeed}', '5') where id = 'store';
    insert into t_results(name, ok, detail) values ('scroll speed outside 10-200% is refused', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('scroll speed outside 10-200% is refused', sqlerrm like 'SETTINGS_INVALID%', sqlerrm);
  end;
  update public.settings set data = jsonb_set(data, '{freeShippingThreshold}', '5000') where id = 'store';
  select (data ->> 'freeShippingThreshold')::int into n from public.settings where id = 'store';
  insert into t_results(name, ok, detail) values ('owner changes the free-shipping threshold', n = 5000, n::text);
  update public.settings set data = jsonb_set(data, '{freeShippingThreshold}', '3000') where id = 'store';

  begin
    delete from public.staff where email = 'rootland.store@gmail.com';
    insert into t_results(name, ok, detail) values ('main owner cannot be removed', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('main owner cannot be removed', true, sqlerrm);
  end;

  -- the public sees the review after publishing; coupon works for guests
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  select count(*) into n from public.reviews;
  insert into t_results(name, ok, detail) values ('published review is public', n = 1, n::text);

  v2 := public.check_coupon('test10', 2500);
  insert into t_results(name, ok, detail) values ('coupon preview gives 10%', (v2 ->> 'discount')::int = 250, v2::text);
  v2 := public.check_coupon('TEST10', 900);
  insert into t_results(name, ok, detail) values ('coupon minimum order is enforced', v2 ->> 'reason' = 'MIN_ORDER', v2::text);

  v2 := public.place_order('[{"variantId":"eh-blk-l","quantity":2,"isPreorder":false}]',
    '{"fullName":"Coupon User","phone":"01512345678","governorate":"cairo","city":"C","streetAddress":"S"}', '', '', 'test10', 'en', 2315);
  insert into t_results(name, ok, detail) values ('order with coupon: 2500 - 250 + 65', (v2 ->> 'total')::int = 2315 and v2 ->> 'coupon_code' = 'TEST10', v2 ->> 'total');
  begin
    perform public.place_order('[{"variantId":"eh-blk-l","quantity":1,"isPreorder":false}]',
      '{"fullName":"Coupon User","phone":"01512345678","governorate":"cairo","city":"C","streetAddress":"S"}', '', '', 'TEST10', 'en', 1190);
    insert into t_results(name, ok, detail) values ('one-use coupon refused the second time', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('one-use coupon refused the second time', sqlerrm = 'COUPON_ALREADY_USED', sqlerrm);
  end;

  -- pre-order once a size sells out: set wgy-xl stock to 0 as owner first
  execute 'reset role';
  update public.product_variants set stock_count = 0 where id = 'eh-wgy-xl';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  v2 := public.place_order('[{"variantId":"eh-wgy-xl","quantity":2,"isPreorder":true}]',
    '{"fullName":"Pre Order","phone":"01098765432","governorate":"cairo","city":"C","streetAddress":"S"}', '', '', '', 'ar', 2063);
  select stock_count into n from public.product_variants where id = 'eh-wgy-xl';
  insert into t_results(name, ok, detail) values ('pre-order of a sold-out size is accepted and does not touch stock',
    (v2 ->> 'is_preorder')::boolean and n = 0 and (v2 ->> 'preorder_note') like '%14%', coalesce(v2 ->> 'preorder_note', 'null'));

  -- order flood guard
  begin
    for i in 1..6 loop
      perform public.place_order('[{"variantId":"eh-blk-xxl","quantity":1,"isPreorder":false}]',
        '{"fullName":"Flood","phone":"01011112222","governorate":"cairo","city":"C","streetAddress":"S"}', '', '', '', 'en', 1315);
    end loop;
    insert into t_results(name, ok, detail) values ('6th order from one phone within an hour is refused', false, 'no error');
  exception when others then
    insert into t_results(name, ok, detail) values ('6th order from one phone within an hour is refused', sqlerrm = 'TOO_MANY_ORDERS', sqlerrm);
  end;

  execute 'reset role';
  select count(*) into n from public.audit_logs;
  insert into t_results(name, ok, detail) values ('audit trail recorded the actions', n >= 10, n::text);
end;
$$;

select n, ok, name, left(detail, 160) as detail from t_results order by n;
