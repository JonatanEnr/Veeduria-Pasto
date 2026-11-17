-- =====================================================================
--  Migración 02 · Moderación + datos privados del denunciante
--  Ejecutar UNA vez en Supabase: SQL Editor → New query → pegar → Run
--  (es seguro volver a ejecutarlo)
-- =====================================================================

-- 1) Estado de moderación ---------------------------------------------
--    Las denuncias que YA existen quedan 'aprobada' (siguen visibles);
--    las nuevas del público entran como 'revision'.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'denuncias' and column_name = 'moderacion'
  ) then
    alter table public.denuncias
      add column moderacion text not null default 'aprobada'
      check (moderacion in ('revision', 'aprobada', 'rechazada'));
    alter table public.denuncias alter column moderacion set default 'revision';
  end if;
end $$;

alter table public.denuncias add column if not exists moderada_at timestamptz;
create index if not exists denuncias_moderacion_idx on public.denuncias (moderacion);

-- 2) Datos del denunciante (PRIVADOS: solo los ve el administrador) -----
create table if not exists public.denunciantes (
  denuncia_id   uuid primary key references public.denuncias (id) on delete cascade,
  nombre        text not null check (char_length(nombre) between 3 and 80),
  celular       text not null check (celular ~ '^3[0-9]{9}$'),
  cargo         text not null check (char_length(cargo) between 2 and 60),
  autoriza_datos boolean not null check (autoriza_datos),
  created_at    timestamptz not null default now()
);
create index if not exists denunciantes_celular_idx on public.denunciantes (celular, created_at);

alter table public.denunciantes enable row level security;
revoke all on public.denunciantes from anon;
grant select, delete on public.denunciantes to authenticated;

drop policy if exists "Solo admin ve denunciantes" on public.denunciantes;
create policy "Solo admin ve denunciantes"
  on public.denunciantes for select
  to authenticated
  using (public.es_admin());

-- 3) Visibilidad: el público solo ve lo aprobado -----------------------
drop policy if exists "Todos pueden ver denuncias" on public.denuncias;
drop policy if exists "Publico ve aprobadas, admin ve todo" on public.denuncias;
create policy "Publico ve aprobadas, admin ve todo"
  on public.denuncias for select
  to anon, authenticated
  using (moderacion = 'aprobada' or public.es_admin());

-- El público ya no inserta directo: lo hace por la función de abajo,
-- que guarda denuncia + denunciante juntos y fuerza 'revision'.
drop policy if exists "Ciudadanos registran denuncias pendientes" on public.denuncias;
drop policy if exists "Solo admin inserta directo" on public.denuncias;
create policy "Solo admin inserta directo"
  on public.denuncias for insert
  to authenticated
  with check (public.es_admin());
revoke insert on public.denuncias from anon;

-- 4) Registro de denuncias ----------------------------------------------
create or replace function public.registrar_denuncia(
  p_titulo        text,
  p_descripcion   text,
  p_secretaria    text,
  p_direccion     text,
  p_barrio        text,
  p_lat           double precision,
  p_lng           double precision,
  p_foto_url      text,
  p_youtube       text,
  p_nombre        text,
  p_celular       text,
  p_cargo         text,
  p_autoriza_datos boolean,
  p_estado        text default 'pendiente'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin   boolean := public.es_admin();
  v_celular text    := regexp_replace(coalesce(p_celular, ''), '\D', '', 'g');
  v_contacto boolean := coalesce(btrim(p_nombre), '') <> '';
  v_id      uuid;
begin
  if length(v_celular) = 12 and left(v_celular, 2) = '57' then
    v_celular := right(v_celular, 10);
  end if;

  if not v_admin then
    if not v_contacto then
      raise exception 'Debes escribir tu nombre, celular y cargo.';
    end if;
    if (select count(*) from public.denunciantes
        where celular = v_celular and created_at > now() - interval '1 day') >= 5 then
      raise exception 'Este celular ya registró 5 denuncias hoy. Intenta mañana.';
    end if;
  end if;

  if v_contacto and not coalesce(p_autoriza_datos, false) then
    raise exception 'Debes autorizar el tratamiento de tus datos personales.';
  end if;

  if p_foto_url is not null
     and p_foto_url not like 'https://%.supabase.co/storage/v1/object/public/evidencias/%' then
    raise exception 'URL de foto no válida.';
  end if;

  insert into public.denuncias (
    titulo, descripcion, secretaria, direccion, barrio, lat, lng,
    foto_url, youtube, estado, fecha_solucion, moderacion, moderada_at
  ) values (
    btrim(p_titulo),
    nullif(btrim(p_descripcion), ''),
    p_secretaria,
    nullif(btrim(p_direccion), ''),
    nullif(btrim(p_barrio), ''),
    p_lat, p_lng,
    p_foto_url,
    nullif(btrim(p_youtube), ''),
    case when v_admin and p_estado = 'solucionado' then 'solucionado' else 'pendiente' end,
    case when v_admin and p_estado = 'solucionado' then now() end,
    case when v_admin then 'aprobada' else 'revision' end,
    case when v_admin then now() end
  )
  returning id into v_id;

  if v_contacto then
    insert into public.denunciantes (denuncia_id, nombre, celular, cargo, autoriza_datos)
    values (v_id, btrim(p_nombre), v_celular, btrim(p_cargo), true);
  end if;

  return v_id;
end;
$$;

revoke all on function public.registrar_denuncia from public;
grant execute on function public.registrar_denuncia to anon, authenticated;
