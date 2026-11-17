-- =====================================================================
--  Mapa de Denuncias · Veeduría Pasto — Esquema de base de datos
--  Ejecutar UNA vez en Supabase: SQL Editor → New query → pegar → Run
-- =====================================================================

-- 1) Tabla principal --------------------------------------------------
create table if not exists public.denuncias (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  titulo          text not null check (char_length(titulo) between 1 and 100),
  descripcion     text check (char_length(descripcion) <= 2000),
  secretaria      text not null check (char_length(secretaria) <= 40),
  direccion       text check (char_length(direccion) <= 200),
  barrio          text check (char_length(barrio) <= 120),
  -- Coordenadas restringidas al municipio de Pasto (urbano + corregimientos)
  lat             double precision not null check (lat between 0.81 and 1.365),
  lng             double precision not null check (lng between -77.395 and -77.015),
  foto_url        text check (char_length(foto_url) <= 500),
  youtube         text check (char_length(youtube) <= 300),
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente', 'solucionado')),
  fecha_solucion  timestamptz
);

create index if not exists denuncias_created_at_idx on public.denuncias (created_at desc);

-- 2) Administradores (veedores que pueden cambiar estado / eliminar) --
create table if not exists public.administradores (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.administradores enable row level security;
-- Sin políticas: nadie la lee desde la API; solo la función de abajo.

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.administradores where user_id = auth.uid()
  );
$$;

grant execute on function public.es_admin() to anon, authenticated;

-- 3) Seguridad a nivel de fila (RLS) ----------------------------------
alter table public.denuncias enable row level security;

grant select, insert on public.denuncias to anon;
grant select, insert, update, delete on public.denuncias to authenticated;

drop policy if exists "Todos pueden ver denuncias" on public.denuncias;
create policy "Todos pueden ver denuncias"
  on public.denuncias for select
  to anon, authenticated
  using (true);

-- Cualquiera puede denunciar, pero solo entra como 'pendiente'
-- (salvo que quien la registra sea administrador).
drop policy if exists "Ciudadanos registran denuncias pendientes" on public.denuncias;
create policy "Ciudadanos registran denuncias pendientes"
  on public.denuncias for insert
  to anon, authenticated
  with check (
    (estado = 'pendiente' and fecha_solucion is null)
    or public.es_admin()
  );

drop policy if exists "Solo admin actualiza" on public.denuncias;
create policy "Solo admin actualiza"
  on public.denuncias for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

drop policy if exists "Solo admin elimina" on public.denuncias;
create policy "Solo admin elimina"
  on public.denuncias for delete
  to authenticated
  using (public.es_admin());

-- 4) Almacenamiento de fotos de evidencia -----------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidencias', 'evidencias', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Cualquiera sube evidencias" on storage.objects;
create policy "Cualquiera sube evidencias"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'evidencias');

drop policy if exists "Solo admin borra evidencias" on storage.objects;
create policy "Solo admin borra evidencias"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'evidencias' and public.es_admin());

-- =====================================================================
-- 5) DESPUÉS de crear tu usuario en Authentication → Users → Add user,
--    ejecuta esto (cambia el correo) para volverte administrador:
--
--    insert into public.administradores (user_id)
--    select id from auth.users where email = 'TU_CORREO@ejemplo.com';
-- =====================================================================
