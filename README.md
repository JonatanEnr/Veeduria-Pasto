# Mapa de Denuncias · Veeduría Ciudadana de Pasto

Aplicación web para registrar, moderar y hacer seguimiento público a denuncias ciudadanas sobre el mapa real de San Juan de Pasto (OpenStreetMap).

## Stack
- **Vite 6** + **React 18** + **Tailwind CSS 4**
- **Leaflet 1.9** + react-leaflet 4, con agrupación de puntos (`leaflet.markercluster`) y mapa de calor (`leaflet.heat`)
- **Supabase** (Postgres + Storage + Auth) con seguridad por filas (RLS)
- **Vercel** (sitio + funciones en `/api`) y Vercel Web Analytics
- Geocodificación inversa con **Nominatim**; límites de comunas de **OpenStreetMap** (ODbL)

## Uso
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera /dist
npm run obsidian   # trae las denuncias a la bóveda de Obsidian
npm run respaldo   # copia de seguridad completa (datos + fotos)
```

## Funcionalidades

**Ciudadanos**
- Tocar una calle (o «Denunciar aquí» con el GPS) → formulario con dirección y barrio automáticos.
- Denuncia **con datos** (nombre, celular, cargo + autorización Ley 1581) o **anónima**.
- Foto (se comprime y se le quitan los metadatos/GPS) y enlace de YouTube.
- Aviso de **posibles duplicados** a menos de 60 m, con opción de apoyar la existente.
- **«Yo también lo veo»**: un apoyo por dispositivo en denuncias pendientes.
- **Días sin solución**, **antes / después**, **línea de tiempo de seguimiento**.
- **Compartir** cada denuncia: `/d/<id>` muestra vista previa con foto en redes.
- **Ranking de entidades y comunas** (días promedio para resolver, pendientes…).
- Capas de **comunas** y **mapa de calor**; filtros por estado, entidad, comuna y orden.
- Páginas de **Política de datos** (`#privacidad`) y **Criterios de moderación** (`#criterios`).

**Veedor (con sesión)**
- Moderación: Por revisar → Aprobar / Rechazar / Ocultar.
- Ver contacto privado del denunciante (WhatsApp / llamar).
- Marcar solucionado con **foto del después**; reabrir.
- Registrar **seguimiento**: radicado, respuesta, visita, nota (es público).
- Exportar JSON, sincronizar con Obsidian, respaldo completo.

## Base de datos (Supabase)

Ejecutar en **SQL Editor**, en orden y una sola vez cada uno:

| Archivo | Qué hace |
|---|---|
| `supabase/esquema.sql` | Tabla de denuncias, administradores, RLS, bucket de fotos |
| `supabase/02-moderacion-y-denunciantes.sql` | Moderación, datos privados del denunciante, denuncia anónima |
| `supabase/03-seguimiento-apoyos-solucion.sql` | Seguimiento, apoyos, foto del después |
| `supabase/04-activar-captcha.sql` | **Solo** al activar el captcha (ver abajo) |

Volverte administrador (tras crear tu usuario en *Authentication → Users*):
```sql
insert into public.administradores (user_id)
select id from auth.users where email = 'TU_CORREO@ejemplo.com';
```

**Permisos que aplica la base de datos**

| | Público | Veedor |
|---|---|---|
| Ver denuncias aprobadas, fotos y seguimiento | ✅ | ✅ |
| Registrar denuncia (entra *en revisión*) | ✅ | ✅ (se publica directo) |
| Apoyar una denuncia | ✅ | ✅ |
| Ver denuncias en revisión / rechazadas | ❌ | ✅ |
| Ver nombre, celular y cargo del denunciante | ❌ | ✅ |
| Moderar, cambiar estado, seguimiento, eliminar | ❌ | ✅ |

## Variables de entorno

Ver `.env.example`. En local van en `.env.local`; en Vercel en *Settings → Environment Variables* (hay que **volver a desplegar** tras cambiarlas).

| Variable | Dónde se usa | ¿Secreta? |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Navegador y `/api` | No (pública por diseño) |
| `VITE_TURNSTILE_SITE_KEY` | Navegador (captcha) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/denunciar`, `npm run respaldo` | **Sí** |
| `TURNSTILE_SECRET_KEY` | `/api/denunciar` | **Sí** |
| `WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | `/api/notificar` | **Sí** |

⚠ Nunca pongas una clave secreta con prefijo `VITE_`: Vite la incrustaría en la página pública.

## Activar servicios opcionales

### Captcha (Cloudflare Turnstile, gratis)
1. https://dash.cloudflare.com → **Turnstile** → *Add widget* → dominio `veeduria-pasto.vercel.app` (y tu dominio propio si lo tienes) → modo *Managed*.
2. En Vercel agrega `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` y `SUPABASE_SERVICE_ROLE_KEY` → **Redeploy**.
3. Comprueba que el formulario muestra la verificación y que una denuncia de prueba llega.
4. Solo entonces ejecuta `supabase/04-activar-captcha.sql` (cierra la puerta directa a la base de datos).

### Avisos por Telegram al llegar una denuncia
1. En Telegram habla con **@BotFather** → `/newbot` → copia el *token*.
2. Escríbele cualquier mensaje a tu bot y abre `https://api.telegram.org/bot<TOKEN>/getUpdates`: el número en `"chat":{"id": …}` es tu `TELEGRAM_CHAT_ID`.
3. Inventa una contraseña larga para `WEBHOOK_SECRET`.
4. En Vercel agrega las tres variables → **Redeploy**.
5. En Supabase: **Database → Webhooks → Create a new hook**: tabla `denuncias`, evento `Insert`, tipo *HTTP Request*, `POST` a `https://veeduria-pasto.vercel.app/api/notificar`, cabecera `x-webhook-secret: <tu WEBHOOK_SECRET>`.

### Estadísticas de visitas
Vercel → proyecto → **Analytics** → *Enable*. El código ya está incluido.

### Dominio propio
Compra el dominio (p. ej. en un registrador `.co`) → Vercel → **Settings → Domains → Add** → sigue las instrucciones de DNS. Luego actualízalo en Supabase (*Authentication → URL Configuration*) y en Turnstile.

## Copias de seguridad
`npm run respaldo` (o doble clic en `Respaldo.cmd`) guarda en `respaldos/AAAA-MM-DD/` todas las tablas (incluidos datos personales y denuncias no publicadas) y descarga las fotos a `respaldos/fotos/`. Requiere `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`. **Hazlo cada semana** y guarda una copia fuera del PC. La carpeta está excluida de git.

## Obsidian
`npm run obsidian` (o `Sincronizar Obsidian.cmd`) crea una nota por denuncia **publicada** en `../Mapa Denuncias Pasto/Denuncia` (configurable con `OBSIDIAN_CARPETA_DENUNCIAS`). Conserva lo escrito bajo `## Mis notas`; descarga la foto; marca `en_mapa: false` si una denuncia sale del mapa. Es de una sola vía (mapa → Obsidian).

## Datos de la organización
Completa `responsable` y `correo` en `src/constants/organizacion.js`: aparecen en la Política de tratamiento de datos que exige la Ley 1581 de 2012.
