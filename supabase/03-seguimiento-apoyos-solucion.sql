-- =====================================================================
--  Migración 03 · Seguimiento, apoyos ciudadanos y foto del "después"
--  Ejecutar DESPUÉS de la 02. Es seguro volver a ejecutarlo.
-- =====================================================================

-- 1) Nuevas columnas -------------------------------------------------------
alter table public.denuncias add column if not exists foto_solucion_url text
  check (char_length(foto_solucion_url) <= 500);
alter table public.denuncias add column if not exists apoyos integer not null default 0
  check (apoyos >= 0);

-- 2) Historial de seguimiento (público para denuncias aprobadas) -----------
create table if not exists public.seguimientos (
  id          uuid primary key default gen_random_uuid(),
  denuncia_id uuid not null references public.denuncias (id) on delete cascade,
  tipo        text not null check (tipo in ('radicado', 'respuesta', 'visita', 'nota')),
  detalle     text not null check (char_length(detalle) between 3 and 1000),
  fecha       date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists seguimientos_denuncia_idx on public.seguimientos (denuncia_id, fecha);

alter table public.seguimientos enable row level security;
grant select on public.seguimientos to anon;
grant select, insert, update, delete on public.seguimientos to authenticated;

drop policy if exists "Ver seguimiento de denuncias visibles" on public.seguimientos;
create policy "Ver seguimiento de denuncias visibles"
  on public.seguimientos for select
  to anon, authenticated
  using (
    public.es_admin()
    or exists (select 1 from public.denuncias d where d.id = denuncia_id and d.moderacion = 'aprobada')
  );

drop policy if exists "Solo admin gestiona seguimiento" on public.seguimientos;
create policy "Solo admin gestiona seguimiento"
  on public.seguimientos for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- 3) Apoyos "Yo también lo veo" -------------------------------------------
--    Uno por dispositivo y denuncia (huella anónima guardada en el navegador).
create table if not exists public.apoyos (
  denuncia_id uuid not null references public.denuncias (id) on delete cascade,
  huella      text not null check (char_length(huella) between 16 and 64),
  created_at  timestamptz not null default now(),
  primary key (denuncia_id, huella)
);
create index if not exists apoyos_huella_idx on public.apoyos (huella, created_at);
alter table public.apoyos enable row level security;
revoke all on public.apoyos from anon, authenticated;

create or replace function public.apoyar_denuncia(p_denuncia uuid, p_huella text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  if not exists (
    select 1 from public.denuncias
    where id = p_denuncia and moderacion = 'aprobada' and estado = 'pendiente'
  ) then
    raise exception 'Solo se pueden apoyar denuncias pendientes publicadas.';
  end if;

  if (select count(*) from public.apoyos
      where huella = p_huella and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Demasiados apoyos seguidos. Intenta más tarde.';
  end if;

  insert into public.apoyos (denuncia_id, huella) values (p_denuncia, p_huella)
  on conflict do nothing;

  if found then
    update public.denuncias set apoyos = apoyos + 1 where id = p_denuncia
    returning apoyos into v_total;
  else
    select apoyos into v_total from public.denuncias where id = p_denuncia;
  end if;

  return v_total;
end;
$$;

revoke all on function public.apoyar_denuncia from public;
grant execute on function public.apoyar_denuncia to anon, authenticated;
