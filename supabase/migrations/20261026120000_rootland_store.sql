-- RootLand store on Supabase.
--
-- Accounts (Supabase Auth + profiles), staff roles, catalog, live stock, cash-on-delivery
-- orders, coupons, reviews, B2B requests, store settings and an audit trail.
-- Row level security is on for every table. Money and stock only change inside the
-- SECURITY DEFINER functions below, which check the caller's role themselves.

set role postgres;

-- =====================================================================================
-- Helpers
-- =====================================================================================

-- Egyptian mobile: 010 / 011 / 012 / 015 + 8 digits (accepts +20 / 0020 prefixes). NULL when invalid.
create or replace function public.normalize_egypt_mobile(p_raw text)
returns text
language plpgsql
immutable
as $$
declare
  d text := regexp_replace(coalesce(p_raw, ''), '[^0-9]', '', 'g');
begin
  if d like '0020%' then
    d := substr(d, 5);
  elsif d like '20%' and length(d) = 12 then
    d := substr(d, 3);
  end if;
  if length(d) = 10 and d like '1%' then
    d := '0' || d;
  end if;
  if d ~ '^01[0125][0-9]{8}$' then
    return d;
  end if;
  return null;
end;
$$;

-- =====================================================================================
-- Staff roles
-- =====================================================================================

create type public.staff_role as enum ('OWNER', 'ORDERS', 'CONTENT', 'MARKETING');

create table public.staff (
  email text primary key check (email = lower(btrim(email)) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  role public.staff_role not null,
  added_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.staff (email, role, added_by) values ('rootland.store@gmail.com', 'OWNER', 'setup');

-- The signed-in user's staff role. Only counts once the account's email address is confirmed,
-- so nobody can claim a staff email they do not own.
create or replace function public.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = public, auth
as $$
  select s.role
  from public.staff s
  join auth.users u on lower(u.email) = s.email
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
$$;

create or replace function public.has_staff_role(p_roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_staff_role() is not null and public.current_staff_role() = any(p_roles)
$$;

-- For the storefront: the caller's role as text, NULL for customers and guests.
create or replace function public.my_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.current_staff_role()::text
$$;

-- Email of the signed-in user (NULL for guests).
create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(email) from auth.users where id = auth.uid()
$$;

-- =====================================================================================
-- Audit trail (append-only; written by triggers and functions, read by the owner)
-- =====================================================================================

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  resource text not null,
  resource_id text not null,
  details text not null,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

create or replace function public.write_audit(p_actor text, p_action text, p_resource text, p_resource_id text, p_details text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_logs (actor, action, resource, resource_id, details)
  values (p_actor, p_action, p_resource, p_resource_id, p_details)
$$;

-- Logs staff changes to a table. Changes made outside a signed-in session (setup scripts) are not logged.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text := public.current_user_email();
  v_row jsonb;
  v_id text;
  v_details text;
begin
  if v_actor is null then
    return null;
  end if;
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;
  v_id := coalesce(v_row ->> 'id', v_row ->> 'code', v_row ->> 'email');
  if tg_op = 'UPDATE' then
    select 'Changed: ' || string_agg(n.key, ', ' order by n.key)
      into v_details
      from jsonb_each(to_jsonb(new)) n
     where n.key not in ('updated_at', 'updated_by')
       and n.value is distinct from (to_jsonb(old) -> n.key);
    if v_details is null then
      return null;
    end if;
  elsif tg_op = 'INSERT' then
    v_details := 'Created';
  else
    v_details := 'Deleted';
  end if;
  perform public.write_audit(v_actor, upper(tg_table_name) || '_' || tg_op, tg_table_name, v_id, v_details);
  return null;
end;
$$;

-- =====================================================================================
-- Profiles (one per account)
-- =====================================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (phone is null or char_length(phone) <= 32),
  addresses jsonb not null default '[]'::jsonb check (jsonb_typeof(addresses) = 'array'),
  fit_profile jsonb check (fit_profile is null or jsonb_typeof(fit_profile) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    lower(new.email),
    left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120),
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), 32), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = lower(new.email), updated_at = now() where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Customers may edit their name, phone, addresses and fit profile, never the id, email or dates.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.id := old.id;
    new.email := old.email;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- =====================================================================================
-- Catalog and live stock
-- =====================================================================================

create table public.products (
  id text primary key check (id ~ '^[a-z0-9-]{3,64}$'),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  status text not null default 'active' check (status in ('active', 'draft', 'hidden')),
  price integer not null check (price > 0),
  sale_price integer check (sale_price is null or sale_price > 0),
  sort_order integer not null default 0,
  -- Everything else about the product (names, copy, images, specs, measurements, colours, sizes)
  details jsonb not null check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id text primary key,
  product_id text not null references public.products (id) on delete cascade,
  sku text not null unique,
  color_name text not null,
  color_name_ar text,
  color_hex text not null,
  size text not null check (size in ('S', 'M', 'L', 'XL', 'XXL')),
  stock_count integer not null default 0 check (stock_count >= 0),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index product_variants_product_idx on public.product_variants (product_id);

-- Price the customer pays right now (same rule as activePrice() in the app).
create or replace function public.product_active_price(p_price integer, p_sale_price integer)
returns integer
language sql
immutable
as $$
  select case when p_sale_price is not null and p_sale_price < p_price then p_sale_price else p_price end
$$;

-- =====================================================================================
-- Store settings (store = shipping, pre-orders, contact, pixels; content = storefront text)
-- =====================================================================================

create table public.settings (
  id text primary key check (id in ('store', 'content')),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by text not null default 'setup'
);

-- Checkout depends on these values, so a bad edit is rejected instead of breaking orders.
create or replace function public.settings_validate()
returns trigger
language plpgsql
as $$
declare
  g jsonb;
begin
  if new.id = 'store' then
    if jsonb_typeof(new.data -> 'governorates') is distinct from 'array' then
      raise exception 'SETTINGS_INVALID: governorates must be a list';
    end if;
    if jsonb_array_length(new.data -> 'governorates') <> 27 then
      raise exception 'SETTINGS_INVALID: governorates must list all 27 governorates';
    end if;
    for g in select * from jsonb_array_elements(new.data -> 'governorates') loop
      if jsonb_typeof(g -> 'id') is distinct from 'string' or btrim(g ->> 'id') = ''
         or jsonb_typeof(g -> 'name') is distinct from 'string'
         or jsonb_typeof(g -> 'nameArabic') is distinct from 'string'
         or jsonb_typeof(g -> 'fee') is distinct from 'number' then
        raise exception 'SETTINGS_INVALID: every governorate needs an id, names and a fee';
      end if;
      if (g ->> 'fee')::numeric < 0 or (g ->> 'fee')::numeric <> trunc((g ->> 'fee')::numeric) then
        raise exception 'SETTINGS_INVALID: governorate fees must be whole numbers of 0 or more';
      end if;
    end loop;
    if jsonb_typeof(new.data -> 'freeShippingThreshold') is distinct from 'number' then
      raise exception 'SETTINGS_INVALID: freeShippingThreshold must be a number';
    end if;
    if (new.data ->> 'freeShippingThreshold')::numeric <= 0 then
      raise exception 'SETTINGS_INVALID: freeShippingThreshold must be more than 0';
    end if;
    if jsonb_typeof(new.data -> 'preorderEnabled') is distinct from 'boolean' then
      raise exception 'SETTINGS_INVALID: preorderEnabled must be true or false';
    end if;
    if jsonb_typeof(new.data -> 'preorderMaxPerVariant') is distinct from 'number' then
      raise exception 'SETTINGS_INVALID: preorderMaxPerVariant must be a number';
    end if;
    if (new.data ->> 'preorderMaxPerVariant')::numeric < 0
       or (new.data ->> 'preorderMaxPerVariant')::numeric <> trunc((new.data ->> 'preorderMaxPerVariant')::numeric) then
      raise exception 'SETTINGS_INVALID: preorderMaxPerVariant must be a whole number of 0 or more';
    end if;
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(public.current_user_email(), new.updated_by);
  return new;
end;
$$;

create trigger settings_validate
  before insert or update on public.settings
  for each row execute function public.settings_validate();

-- =====================================================================================
-- Orders (cash on delivery)
-- =====================================================================================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  customer_email text not null default '',
  customer_phone text not null,
  -- fullName, phone, governorate (English name), governorateId, governorateAr, city, district,
  -- streetAddress, buildingNumber, floorApartment, nearestLandmark
  shipping_address jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  subtotal integer not null check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0 and discount <= subtotal),
  shipping_fee integer not null check (shipping_fee >= 0),
  total integer not null check (total = subtotal - discount + shipping_fee),
  coupon_code text,
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  payment_status text not null default 'cash_on_delivery' check (payment_status in ('cash_on_delivery', 'paid')),
  order_status text not null default 'pending'
    check (order_status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refused', 'returned')),
  is_preorder boolean not null default false,
  preorder_note text,
  customer_language text not null default 'en' check (customer_language in ('en', 'ar')),
  notes text not null default '' check (char_length(notes) <= 1000),
  courier text not null default '',
  tracking_number text not null default '',
  -- In-stock items were put back once (cancelled / refused); reset if the order is reopened.
  stock_released boolean not null default false,
  timeline jsonb not null default '[]'::jsonb check (jsonb_typeof(timeline) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_idx on public.orders (user_id);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_phone_idx on public.orders (customer_phone);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text not null,
  variant_id text not null,
  sku text not null,
  product_name text not null,
  product_name_ar text,
  color_name text not null,
  color_name_ar text,
  size text not null,
  unit_price integer not null check (unit_price > 0),
  quantity integer not null check (quantity between 1 and 20),
  image text not null,
  is_preorder boolean not null default false
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (variant_id);

-- Staff-only notes, kept out of the orders table because customers can read their own orders.
create table public.order_internal_notes (
  order_id uuid primary key references public.orders (id) on delete cascade,
  notes text not null default '' check (char_length(notes) <= 4000),
  updated_by text not null,
  updated_at timestamptz not null default now()
);

-- Human-friendly order number, e.g. RL-261026-7KQ4 (Cairo date).
create or replace function public.generate_order_number()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  suffix text := '';
begin
  for i in 1..4 loop
    suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return 'RL-' || to_char(now() at time zone 'Africa/Cairo', 'YYMMDD') || '-' || suffix;
end;
$$;

-- Full order row with its items, in the shape the app reads (snake_case, items under order_items).
create or replace function public.order_json(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(o) || jsonb_build_object(
    'order_items',
    coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.order_items i where i.order_id = o.id), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id
$$;

-- =====================================================================================
-- Coupons
-- =====================================================================================

create table public.coupons (
  code text primary key check (code = upper(btrim(code)) and code ~ '^[A-Z0-9_-]{3,32}$'),
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  min_order_amount integer not null default 0 check (min_order_amount >= 0),
  start_date timestamptz,
  end_date timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  one_use_per_customer boolean not null default false,
  free_shipping boolean not null default false,
  active boolean not null default true,
  -- Phone numbers (and "uid:<account id>") that used the code
  used_by text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percentage' or discount_value <= 100),
  check (end_date is null or start_date is null or end_date > start_date)
);

-- Discount a code gives on a subtotal, or the reason it does not apply. Shared by the checkout
-- preview (check_coupon) and place_order so both always agree.
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
    'freeShipping', c.free_shipping
  );
end;
$$;

-- Checkout preview. The phone is not known yet, so "one use per customer" is checked again at place_order.
create or replace function public.check_coupon(p_code text, p_subtotal integer)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.coupon_quote(p_code, greatest(p_subtotal, 0), null, auth.uid())
$$;

-- =====================================================================================
-- Reviews
-- =====================================================================================

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 80),
  location text not null default '' check (char_length(location) <= 80),
  rating integer not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 120),
  comment text not null check (char_length(btrim(comment)) between 1 and 2000),
  size_purchased text not null default '' check (char_length(size_purchased) <= 8),
  fit_vote text not null default 'True to Size' check (fit_vote in ('Runs Small', 'True to Size', 'Runs Large')),
  verified_buyer boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create index reviews_product_idx on public.reviews (product_id);

-- Customers submit reviews hidden until the Content team publishes them. Signed-in customers
-- with a delivered order of the product are marked as verified buyers.
create or replace function public.submit_review(
  p_product_id text,
  p_author_name text,
  p_rating integer,
  p_comment text,
  p_size text,
  p_location text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_verified boolean := false;
begin
  if not exists (select 1 from public.products where id = p_product_id and status = 'active') then
    raise exception 'PRODUCT_UNAVAILABLE';
  end if;
  if auth.uid() is not null then
    select exists (
      select 1
        from public.orders o
        join public.order_items i on i.order_id = o.id
       where o.user_id = auth.uid() and o.order_status = 'delivered' and i.product_id = p_product_id
    ) into v_verified;
  end if;
  insert into public.reviews (product_id, user_id, author_name, location, rating, comment, size_purchased, verified_buyer, published)
  values (p_product_id, auth.uid(), btrim(p_author_name), btrim(coalesce(p_location, '')), p_rating, btrim(p_comment), coalesce(p_size, ''), v_verified, false)
  returning id into v_id;
  return v_id;
end;
$$;

-- =====================================================================================
-- B2B (bulk) quote requests
-- =====================================================================================

create table public.b2b_leads (
  id text primary key,
  company_name text not null check (char_length(btrim(company_name)) between 1 and 200),
  contact_person text not null check (char_length(btrim(contact_person)) between 1 and 120),
  email text not null check (char_length(email) <= 200 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone text not null check (char_length(btrim(phone)) between 6 and 32),
  estimated_quantity integer not null check (estimated_quantity between 100 and 100000),
  -- businessType, employeeCount, productType, preferredColors, brandingTechnique,
  -- requiredDeliveryDate, additionalRequirements, hasLogoArtwork, logoFileName, estimatedBudgetEgp
  details jsonb not null check (jsonb_typeof(details) = 'object'),
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'sampling', 'in_production', 'completed')),
  notes text not null default '' check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.submit_b2b_lead(
  p_company_name text,
  p_contact_person text,
  p_email text,
  p_phone text,
  p_estimated_quantity integer,
  p_details jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if (select count(*) from public.b2b_leads where lower(email) = lower(btrim(p_email)) and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'TOO_MANY_REQUESTS';
  end if;
  v_id := 'B2B-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  insert into public.b2b_leads (id, company_name, contact_person, email, phone, estimated_quantity, details)
  values (v_id, btrim(p_company_name), btrim(p_contact_person), lower(btrim(p_email)), btrim(p_phone), p_estimated_quantity, p_details);
  perform public.write_audit(lower(btrim(p_email)), 'B2B_LEAD_SUBMITTED', 'b2b_leads', v_id,
    btrim(p_company_name) || ' asked about ' || p_estimated_quantity || ' pieces');
  return v_id;
end;
$$;

-- =====================================================================================
-- Placing, tracking and managing orders
-- =====================================================================================

-- p_items: [{ "variantId": text, "quantity": int, "isPreorder": bool }]
-- p_address: { fullName, phone, governorate (governorate id), city, district, streetAddress,
--              buildingNumber, floorApartment, nearestLandmark }
-- p_expected_total: the total the customer saw; the order is refused if prices changed meanwhile.
-- Errors start with a code the checkout recognises (OUT_OF_STOCK:<item>, TOTAL_CHANGED:<total>, ...).
create or replace function public.place_order(
  p_items jsonb,
  p_address jsonb,
  p_email text,
  p_notes text,
  p_coupon_code text,
  p_language text,
  p_expected_total integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
  v_gov jsonb;
  v_item jsonb;
  v_variant public.product_variants;
  v_product public.products;
  v_qty integer;
  v_is_pre boolean;
  v_unit integer;
  v_label text;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_free_shipping boolean := false;
  v_fee integer;
  v_total integer;
  v_quote jsonb;
  v_coupon text;
  v_phone text := public.normalize_egypt_mobile(p_address ->> 'phone');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := btrim(coalesce(p_address ->> 'fullName', ''));
  v_city text := btrim(coalesce(p_address ->> 'city', ''));
  v_street text := btrim(coalesce(p_address ->> 'streetAddress', ''));
  v_has_pre boolean := false;
  v_pre_open integer;
  v_order_id uuid;
  v_number text;
  v_address jsonb;
  v_lang text := case when p_language = 'ar' then 'ar' else 'en' end;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'INVALID_ITEMS';
  end if;
  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 8 then
    raise exception 'INVALID_ITEMS';
  end if;
  if v_phone is null then
    raise exception 'INVALID_PHONE';
  end if;
  if v_name = '' or char_length(v_name) > 120 then
    raise exception 'INVALID_NAME';
  end if;
  if v_city = '' or v_street = '' then
    raise exception 'INVALID_ADDRESS';
  end if;
  if v_email <> '' and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'INVALID_EMAIL';
  end if;
  if char_length(coalesce(p_notes, '')) > 1000 then
    raise exception 'INVALID_NOTES';
  end if;
  -- A guard against floods of fake orders that would hold back stock.
  if (select count(*) from public.orders where customer_phone = v_phone and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'TOO_MANY_ORDERS';
  end if;

  select data into v_settings from public.settings where id = 'store';
  if v_settings is null then
    raise exception 'SETTINGS_MISSING';
  end if;
  select e.value into v_gov
    from jsonb_array_elements(v_settings -> 'governorates') as e(value)
   where e.value ->> 'id' = p_address ->> 'governorate';
  if v_gov is null then
    raise exception 'INVALID_GOVERNORATE';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item -> 'quantity') is distinct from 'number' then
      raise exception 'INVALID_QUANTITY';
    end if;
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty < 1 or v_qty > 20 then
      raise exception 'INVALID_QUANTITY';
    end if;
    if jsonb_typeof(v_item -> 'isPreorder') is distinct from 'boolean' then
      raise exception 'INVALID_ITEMS';
    end if;
    v_is_pre := (v_item ->> 'isPreorder')::boolean;

    select * into v_variant from public.product_variants where id = v_item ->> 'variantId' for update;
    if not found then
      raise exception 'STOCK_RECORD_MISSING:%', coalesce(v_item ->> 'variantId', '');
    end if;
    select * into v_product from public.products where id = v_variant.product_id and status = 'active';
    if not found then
      raise exception 'PRODUCT_UNAVAILABLE:%', v_variant.product_id;
    end if;

    v_label := coalesce(v_product.details ->> 'nameEn', v_product.details ->> 'name') || ' ' || v_variant.size;
    v_unit := public.product_active_price(v_product.price, v_product.sale_price);

    if v_is_pre then
      if (v_settings -> 'preorderEnabled') <> 'true'::jsonb then
        raise exception 'PREORDER_CLOSED:%', v_label;
      end if;
      if v_variant.stock_count > 0 then
        raise exception 'BACK_IN_STOCK:%', v_label;
      end if;
      select coalesce(sum(i.quantity), 0) into v_pre_open
        from public.order_items i
        join public.orders o on o.id = i.order_id
       where i.variant_id = v_variant.id
         and i.is_preorder
         and o.order_status not in ('delivered', 'cancelled', 'refused', 'returned');
      if v_pre_open + v_qty > (v_settings ->> 'preorderMaxPerVariant')::integer then
        raise exception 'PREORDER_LIMIT:%', v_label;
      end if;
      v_has_pre := true;
    else
      if v_variant.stock_count < v_qty then
        raise exception 'OUT_OF_STOCK:%', v_label;
      end if;
      update public.product_variants
         set stock_count = stock_count - v_qty, updated_at = now()
       where id = v_variant.id;
    end if;

    v_subtotal := v_subtotal + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'variant_id', v_variant.id,
      'sku', v_variant.sku,
      'product_name', coalesce(v_product.details ->> 'nameEn', v_product.details ->> 'name'),
      'product_name_ar', coalesce(v_product.details ->> 'nameAr', v_product.details ->> 'nameArabic'),
      'color_name', v_variant.color_name,
      'color_name_ar', v_variant.color_name_ar,
      'size', v_variant.size,
      'unit_price', v_unit,
      'quantity', v_qty,
      'image', v_product.details ->> 'primaryImage',
      'is_preorder', v_is_pre
    );
  end loop;

  if btrim(coalesce(p_coupon_code, '')) <> '' then
    v_coupon := upper(btrim(p_coupon_code));
    perform 1 from public.coupons where code = v_coupon for update;
    v_quote := public.coupon_quote(v_coupon, v_subtotal, v_phone, auth.uid());
    if (v_quote ->> 'valid')::boolean is not true then
      raise exception 'COUPON_%', v_quote ->> 'reason';
    end if;
    v_discount := (v_quote ->> 'discount')::integer;
    v_free_shipping := (v_quote ->> 'freeShipping')::boolean;
    update public.coupons
       set usage_count = usage_count + 1,
           used_by = used_by || array[v_phone] || case when auth.uid() is null then '{}'::text[] else array['uid:' || auth.uid()::text] end,
           updated_at = now()
     where code = v_coupon;
  end if;

  if v_free_shipping or v_subtotal >= (v_settings ->> 'freeShippingThreshold')::numeric then
    v_fee := 0;
  else
    v_fee := (v_gov ->> 'fee')::integer;
  end if;
  v_total := v_subtotal - v_discount + v_fee;

  if p_expected_total is distinct from v_total then
    raise exception 'TOTAL_CHANGED:%', v_total;
  end if;

  v_address := jsonb_build_object(
    'fullName', v_name,
    'phone', v_phone,
    'governorate', v_gov ->> 'name',
    'governorateId', v_gov ->> 'id',
    'governorateAr', v_gov ->> 'nameArabic',
    'city', v_city,
    'district', btrim(coalesce(p_address ->> 'district', '')),
    'streetAddress', v_street,
    'buildingNumber', btrim(coalesce(p_address ->> 'buildingNumber', '')),
    'floorApartment', btrim(coalesce(p_address ->> 'floorApartment', '')),
    'nearestLandmark', btrim(coalesce(p_address ->> 'nearestLandmark', ''))
  );

  loop
    v_number := public.generate_order_number();
    begin
      insert into public.orders (
        order_number, user_id, customer_email, customer_phone, shipping_address,
        subtotal, discount, shipping_fee, total, coupon_code,
        is_preorder, preorder_note, customer_language, notes, timeline
      )
      values (
        v_number, auth.uid(), v_email, v_phone, v_address,
        v_subtotal, v_discount, v_fee, v_total, v_coupon,
        v_has_pre,
        case when v_has_pre then case when v_lang = 'ar' then v_settings ->> 'preorderNoteAr' else v_settings ->> 'preorderNoteEn' end end,
        v_lang, btrim(coalesce(p_notes, '')),
        jsonb_build_array(jsonb_build_object('status', 'pending', 'timestamp', now(), 'note', 'Order placed. Cash on delivery.'))
      )
      returning id into v_order_id;
      exit;
    exception when unique_violation then
      -- Order number already used today: try another one.
    end;
  end loop;

  insert into public.order_items (
    order_id, product_id, variant_id, sku, product_name, product_name_ar,
    color_name, color_name_ar, size, unit_price, quantity, image, is_preorder
  )
  select v_order_id, l ->> 'product_id', l ->> 'variant_id', l ->> 'sku', l ->> 'product_name', l ->> 'product_name_ar',
         l ->> 'color_name', l ->> 'color_name_ar', l ->> 'size', (l ->> 'unit_price')::integer,
         (l ->> 'quantity')::integer, l ->> 'image', (l ->> 'is_preorder')::boolean
    from jsonb_array_elements(v_lines) l;

  perform public.write_audit(
    coalesce(public.current_user_email(), v_phone), 'ORDER_PLACED', 'orders', v_number,
    'Placed order ' || v_number || ' for ' || v_total || ' EGP (cash on delivery)'
  );

  return public.order_json(v_order_id);
end;
$$;

-- Guest order tracking: needs the order number and the phone used at checkout. Returns no address.
create or replace function public.track_order(p_order_number text, p_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  o public.orders;
  v_phone text := public.normalize_egypt_mobile(p_phone);
begin
  if v_phone is null then
    return null;
  end if;
  select * into o from public.orders where order_number = upper(btrim(p_order_number));
  if not found or o.customer_phone <> v_phone then
    return null;
  end if;
  return jsonb_build_object(
    'order_number', o.order_number,
    'order_status', o.order_status,
    'payment_status', o.payment_status,
    'first_name', split_part(o.shipping_address ->> 'fullName', ' ', 1),
    'governorate', o.shipping_address ->> 'governorate',
    'governorate_ar', o.shipping_address ->> 'governorateAr',
    'city', o.shipping_address ->> 'city',
    'subtotal', o.subtotal,
    'discount', o.discount,
    'shipping_fee', o.shipping_fee,
    'total', o.total,
    'is_preorder', o.is_preorder,
    'preorder_note', o.preorder_note,
    'courier', o.courier,
    'tracking_number', o.tracking_number,
    'created_at', o.created_at,
    'timeline', (
      select coalesce(jsonb_agg(jsonb_build_object('status', e ->> 'status', 'timestamp', e ->> 'timestamp')), '[]'::jsonb)
        from jsonb_array_elements(o.timeline) e
    ),
    'order_items', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'product_name', i.product_name, 'product_name_ar', i.product_name_ar,
               'color_name', i.color_name, 'color_name_ar', i.color_name_ar,
               'size', i.size, 'quantity', i.quantity, 'unit_price', i.unit_price,
               'image', i.image, 'is_preorder', i.is_preorder) order by i.id), '[]'::jsonb)
        from public.order_items i
       where i.order_id = o.id
    )
  );
end;
$$;

-- Staff with order access move an order through its statuses. Cancelling or refusing puts the
-- in-stock items back once; reopening such an order takes them out of stock again.
create or replace function public.update_order_status(p_order_id uuid, p_status text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
  v_actor text := public.current_user_email();
  v_release boolean;
  v_reserve boolean;
  v_short text;
begin
  if not public.has_staff_role(array['OWNER', 'ORDERS']::public.staff_role[]) then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_status not in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refused', 'returned') then
    raise exception 'INVALID_STATUS';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if o.order_status = p_status then
    return public.order_json(o.id);
  end if;

  v_release := p_status in ('cancelled', 'refused') and not o.stock_released;
  v_reserve := p_status not in ('cancelled', 'refused') and o.stock_released;

  if v_release then
    update public.product_variants pv
       set stock_count = pv.stock_count + need.qty, updated_at = now()
      from (select variant_id, sum(quantity) as qty
              from public.order_items
             where order_id = o.id and not is_preorder
             group by variant_id) need
     where pv.id = need.variant_id;
  elsif v_reserve then
    select string_agg(pv.id, ', ') into v_short
      from (select variant_id, sum(quantity) as qty
              from public.order_items
             where order_id = o.id and not is_preorder
             group by variant_id) need
      join public.product_variants pv on pv.id = need.variant_id
     where pv.stock_count < need.qty;
    if v_short is not null then
      raise exception 'OUT_OF_STOCK:%', v_short;
    end if;
    update public.product_variants pv
       set stock_count = pv.stock_count - need.qty, updated_at = now()
      from (select variant_id, sum(quantity) as qty
              from public.order_items
             where order_id = o.id and not is_preorder
             group by variant_id) need
     where pv.id = need.variant_id;
  end if;

  update public.orders
     set order_status = p_status,
         stock_released = case when v_release then true when v_reserve then false else stock_released end,
         payment_status = case
           when p_status = 'delivered' then 'paid'
           when p_status in ('pending', 'confirmed', 'processing', 'shipped') then 'cash_on_delivery'
           else payment_status
         end,
         timeline = timeline || jsonb_build_array(jsonb_build_object(
           'status', p_status,
           'timestamp', now(),
           'note', coalesce(nullif(btrim(p_note), ''), 'Status changed to ' || p_status || ' by ' || v_actor)
         )),
         updated_at = now()
   where id = o.id;

  perform public.write_audit(v_actor, 'ORDER_STATUS_UPDATED', 'orders', o.order_number,
    o.order_status || ' -> ' || p_status ||
    case when v_release then ' (stock returned)' when v_reserve then ' (stock taken again)' else '' end);

  return public.order_json(o.id);
end;
$$;

-- Courier and tracking number (shown to the customer).
create or replace function public.update_order_shipping(p_order_id uuid, p_courier text, p_tracking_number text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number text;
begin
  if not public.has_staff_role(array['OWNER', 'ORDERS']::public.staff_role[]) then
    raise exception 'NOT_ALLOWED';
  end if;
  update public.orders
     set courier = left(btrim(coalesce(p_courier, '')), 80),
         tracking_number = left(btrim(coalesce(p_tracking_number, '')), 80),
         updated_at = now()
   where id = p_order_id
  returning order_number into v_number;
  if v_number is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  perform public.write_audit(public.current_user_email(), 'ORDER_SHIPPING_UPDATED', 'orders', v_number,
    'Courier: ' || left(btrim(coalesce(p_courier, '')), 80) || ', tracking: ' || left(btrim(coalesce(p_tracking_number, '')), 80));
  return public.order_json(p_order_id);
end;
$$;

create or replace function public.save_order_internal_notes(p_order_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_staff_role(array['OWNER', 'ORDERS']::public.staff_role[]) then
    raise exception 'NOT_ALLOWED';
  end if;
  insert into public.order_internal_notes (order_id, notes, updated_by)
  values (p_order_id, left(coalesce(p_notes, ''), 4000), public.current_user_email())
  on conflict (order_id) do update
    set notes = excluded.notes, updated_by = excluded.updated_by, updated_at = now();
end;
$$;

-- Content team sets a size's stock (absolute value). Logged with the before and after counts.
create or replace function public.set_variant_stock(p_variant_id text, p_stock integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before integer;
begin
  if not public.has_staff_role(array['OWNER', 'CONTENT']::public.staff_role[]) then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_stock is null or p_stock < 0 or p_stock > 100000 then
    raise exception 'INVALID_STOCK';
  end if;
  select stock_count into v_before from public.product_variants where id = p_variant_id for update;
  if not found then
    raise exception 'STOCK_RECORD_MISSING:%', p_variant_id;
  end if;
  update public.product_variants set stock_count = p_stock, updated_at = now() where id = p_variant_id;
  perform public.write_audit(public.current_user_email(), 'STOCK_SET', 'product_variants', p_variant_id,
    v_before || ' -> ' || p_stock);
  return p_stock;
end;
$$;

-- Accounts for the admin Customers tab, with sign-in details and order totals.
create or replace function public.admin_customers()
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  order_count bigint,
  total_spent bigint,
  last_order_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.has_staff_role(array['OWNER', 'ORDERS']::public.staff_role[]) then
    raise exception 'NOT_ALLOWED';
  end if;
  return query
    select p.id, p.email, p.full_name, p.phone, u.created_at, u.email_confirmed_at, u.last_sign_in_at,
           count(o.id),
           coalesce(sum(o.total) filter (where o.order_status not in ('cancelled', 'refused', 'returned')), 0)::bigint,
           max(o.created_at)
      from public.profiles p
      join auth.users u on u.id = p.id
      left join public.orders o on o.user_id = p.id
     group by p.id, u.id
     order by u.created_at desc;
end;
$$;

-- =====================================================================================
-- Row level security
-- =====================================================================================

alter table public.staff enable row level security;
alter table public.audit_logs enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_internal_notes enable row level security;
alter table public.coupons enable row level security;
alter table public.reviews enable row level security;
alter table public.b2b_leads enable row level security;

-- Staff: the owner manages admins; everyone else sees nothing (roles are read through my_staff_role()).
create policy staff_owner_all on public.staff
  for all
  using (public.has_staff_role(array['OWNER']::public.staff_role[]))
  with check (public.has_staff_role(array['OWNER']::public.staff_role[]));

-- Audit trail: read by the owner only; nobody writes or edits it directly.
create policy audit_owner_read on public.audit_logs
  for select
  using (public.has_staff_role(array['OWNER']::public.staff_role[]));

-- Profiles: your own; staff who handle orders can read all.
create policy profiles_read on public.profiles
  for select
  using (id = auth.uid() or public.has_staff_role(array['OWNER', 'ORDERS']::public.staff_role[]));
create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Catalog: everyone reads active products; the Content team manages the catalog.
create policy products_read on public.products
  for select
  using (status = 'active' or public.has_staff_role(array['OWNER', 'CONTENT']::public.staff_role[]));
create policy products_write on public.products
  for all
  using (public.has_staff_role(array['OWNER', 'CONTENT']::public.staff_role[]))
  with check (public.has_staff_role(array['OWNER', 'CONTENT']::public.staff_role[]));

create policy variants_read on public.product_variants
  for select
  using (true);
create policy variants_write on public.product_variants
  for all
  using (public.has_staff_role(array['OWNER', 'CONTENT']::public.staff_role[]))
  with check (public.has_staff_role(array['OWNER', 'CONTENT']::public.staff_role[]));

-- Settings: public read; store settings by the owner, storefront text by Content and Marketing too.
create policy settings_read on public.settings
  for select
  using (true);
create policy settings_update on public.settings
  for update
  using (
    public.has_staff_role(array['OWNER']::public.staff_role[]) or
    (id = 'content' and public.has_staff_role(array['CONTENT', 'MARKETING']::public.staff_role[]))
  )
  with check (
    public.has_staff_role(array['OWNER']::public.staff_role[]) or
    (id = 'content' and public.has_staff_role(array['CONTENT', 'MARKETING']::public.staff_role[]))
  );

-- Orders: customers read their own; Orders and Marketing staff read all. Writes go through functions.
create policy orders_read on public.orders
  for select
  using (user_id = auth.uid() or public.has_staff_role(array['OWNER', 'ORDERS', 'MARKETING']::public.staff_role[]));
create policy order_items_read on public.order_items
  for select
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy order_notes_read on public.order_internal_notes
  for select
  using (public.has_staff_role(array['OWNER', 'ORDERS']::public.staff_role[]));

-- Coupons: managed by Marketing; customers check codes through check_coupon().
create policy coupons_marketing_all on public.coupons
  for all
  using (public.has_staff_role(array['OWNER', 'MARKETING']::public.staff_role[]))
  with check (public.has_staff_role(array['OWNER', 'MARKETING']::public.staff_role[]));

-- Reviews: published ones are public; the Content team moderates. New ones come in through submit_review().
create policy reviews_read on public.reviews
  for select
  using (published or public.has_staff_role(array['OWNER', 'CONTENT']::public.staff_role[]));
create policy reviews_content_insert on public.reviews
  for insert
  with check (public.has_staff_role(array['OWNER', 'CONTENT']::public.staff_role[]));
create policy reviews_content_update on public.reviews
  for update
  using (public.has_staff_role(array['OWNER', 'CONTENT']::public.staff_role[]))
  with check (public.has_staff_role(array['OWNER', 'CONTENT']::public.staff_role[]));
create policy reviews_content_delete on public.reviews
  for delete
  using (public.has_staff_role(array['OWNER', 'CONTENT']::public.staff_role[]));

-- B2B requests: Marketing reads and updates them. New ones come in through submit_b2b_lead().
create policy b2b_marketing_read on public.b2b_leads
  for select
  using (public.has_staff_role(array['OWNER', 'MARKETING']::public.staff_role[]));
create policy b2b_marketing_update on public.b2b_leads
  for update
  using (public.has_staff_role(array['OWNER', 'MARKETING']::public.staff_role[]))
  with check (public.has_staff_role(array['OWNER', 'MARKETING']::public.staff_role[]));

-- Keep the hard-coded owner account an owner.
create or replace function public.staff_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and old.email = 'rootland.store@gmail.com' then
    raise exception 'The main owner account cannot be removed';
  end if;
  if tg_op = 'UPDATE' and old.email = 'rootland.store@gmail.com' and (new.role <> 'OWNER' or new.email <> old.email) then
    raise exception 'The main owner account must stay an owner';
  end if;
  if tg_op <> 'DELETE' then
    new.updated_at := now();
    return new;
  end if;
  return old;
end;
$$;

create trigger staff_guard
  before update or delete on public.staff
  for each row execute function public.staff_guard();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger coupons_touch before update on public.coupons for each row execute function public.touch_updated_at();
create trigger b2b_touch before update on public.b2b_leads for each row execute function public.touch_updated_at();

create trigger products_audit after insert or update or delete on public.products for each row execute function public.audit_row_change();
create trigger coupons_audit after insert or update or delete on public.coupons for each row execute function public.audit_row_change();
create trigger reviews_audit after insert or update or delete on public.reviews for each row execute function public.audit_row_change();
create trigger staff_audit after insert or update or delete on public.staff for each row execute function public.audit_row_change();
create trigger settings_audit after update on public.settings for each row execute function public.audit_row_change();
create trigger b2b_audit after update on public.b2b_leads for each row execute function public.audit_row_change();

-- =====================================================================================
-- Function permissions: helpers stay private; customer and staff entry points are explicit.
-- =====================================================================================

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.my_staff_role() to anon, authenticated;
grant execute on function public.check_coupon(text, integer) to anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, text, text, text, text, integer) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.submit_review(text, text, integer, text, text, text) to anon, authenticated;
grant execute on function public.submit_b2b_lead(text, text, text, text, integer, jsonb) to anon, authenticated;

grant execute on function public.update_order_status(uuid, text, text) to authenticated;
grant execute on function public.update_order_shipping(uuid, text, text) to authenticated;
grant execute on function public.save_order_internal_notes(uuid, text) to authenticated;
grant execute on function public.set_variant_stock(text, integer) to authenticated;
grant execute on function public.admin_customers() to authenticated;

-- Row level security policies and the settings trigger call these as the signed-in user.
grant execute on function public.has_staff_role(public.staff_role[]) to anon, authenticated;
grant execute on function public.current_user_email() to anon, authenticated;

-- =====================================================================================
-- Realtime: the admin and the storefront follow these tables live (row level security applies).
-- =====================================================================================

alter publication supabase_realtime add table
  public.products,
  public.product_variants,
  public.settings,
  public.orders,
  public.reviews,
  public.coupons,
  public.b2b_leads,
  public.staff;

notify pgrst, 'reload schema';
