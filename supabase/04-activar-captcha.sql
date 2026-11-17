-- =====================================================================
--  Migración 04 · Activar captcha (Cloudflare Turnstile)
--
--  ⚠ Ejecutar SOLO cuando ya estén configuradas en Vercel:
--     VITE_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY y SUPABASE_SERVICE_ROLE_KEY
--  y el sitio esté desplegado con ellas. Si se ejecuta antes, el público
--  no podrá enviar denuncias.
--
--  Efecto: el público ya no puede registrar denuncias llamando directo a la
--  base de datos; solo a través de /api/denunciar, que verifica el captcha.
--  Los veedores (sesión iniciada) siguen registrando directo.
-- =====================================================================

revoke execute on function public.registrar_denuncia from anon;
grant execute on function public.registrar_denuncia to authenticated, service_role;

-- Para DESACTIVAR el captcha (volver a como estaba):
--   grant execute on function public.registrar_denuncia to anon;
