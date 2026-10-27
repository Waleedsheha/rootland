-- Customer reviews state their own fit vote (the column no longer assumes "True to Size"),
-- and a flood guard keeps the moderation queue usable.

set role postgres;

alter table public.reviews alter column fit_vote drop default;

drop function public.submit_review(text, text, integer, text, text, text);

create or replace function public.submit_review(
  p_product_id text,
  p_author_name text,
  p_rating integer,
  p_comment text,
  p_size text,
  p_location text,
  p_fit_vote text
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
  if p_fit_vote is null or p_fit_vote not in ('Runs Small', 'True to Size', 'Runs Large') then
    raise exception 'INVALID_FIT_VOTE';
  end if;
  if (select count(*) from public.reviews where not published and created_at > now() - interval '1 hour') >= 50 then
    raise exception 'TOO_MANY_REVIEWS';
  end if;
  if auth.uid() is not null then
    select exists (
      select 1
        from public.orders o
        join public.order_items i on i.order_id = o.id
       where o.user_id = auth.uid() and o.order_status = 'delivered' and i.product_id = p_product_id
    ) into v_verified;
  end if;
  insert into public.reviews (product_id, user_id, author_name, location, rating, comment, size_purchased, fit_vote, verified_buyer, published)
  values (p_product_id, auth.uid(), btrim(p_author_name), btrim(coalesce(p_location, '')), p_rating, btrim(p_comment), coalesce(p_size, ''), p_fit_vote, v_verified, false)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.submit_review(text, text, integer, text, text, text, text) from public;
grant execute on function public.submit_review(text, text, integer, text, text, text, text) to anon, authenticated;

reset role;

notify pgrst, 'reload schema';
