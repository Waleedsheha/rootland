-- The owner sets the mouse-wheel scroll speed in Admin → Store settings. It is stored in
-- settings.store as scrollSpeed: the share of the browser's normal wheel step (0.1–2, 1 = normal).
-- The site has been running at 0.25, so that is the starting value.

set role postgres;

update public.settings
   set data = data || jsonb_build_object('scrollSpeed', 0.25)
 where id = 'store' and not (data ? 'scrollSpeed');

-- Same checks as before, plus scrollSpeed.
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
    if jsonb_typeof(new.data -> 'scrollSpeed') is distinct from 'number' then
      raise exception 'SETTINGS_INVALID: scrollSpeed must be a number';
    end if;
    if (new.data ->> 'scrollSpeed')::numeric < 0.1 or (new.data ->> 'scrollSpeed')::numeric > 2 then
      raise exception 'SETTINGS_INVALID: scroll speed must be between 10%% and 200%% of normal';
    end if;
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(public.current_user_email(), new.updated_by);
  return new;
end;
$$;

reset role;

notify pgrst, 'reload schema';
