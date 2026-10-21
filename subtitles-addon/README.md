# Subtítulos Plus — Addon de subtítulos para Stremio

Addon de Stremio (recurso `subtitles`, películas, series y anime, IDs IMDb
`tt…` y de anime `kitsu:`/`mal:`/`anidb:`) que busca subtítulos **en paralelo**
en 6 fuentes y devuelve la unión de resultados. Si una fuente falla, las demás
siguen funcionando: el addon nunca responde con error a Stremio, en el peor
caso responde `{ subtitles: [] }`.

Además, cada resultado se sirve a través de un **proxy propio** (`/sub/…`) que
descarga el archivo original, descomprime el `.zip` si hace falta, lo convierte
a UTF-8 + SRT y lo entrega con CORS. Stremio no sabe abrir `.zip` y muchos de
estos sitios bloquean las descargas directas: sin este paso, el subtítulo puede
aparecer en la lista pero no cargarse nunca.

| Fuente | Método | ¿Necesita clave? |
| --- | --- | --- |
| SubDL (`subdl.com`) | **Scraping Axios+Cheerio** (API oficial de reserva) | No (opcional `SUBDL_API_KEY`) |
| SubSource (`subsource.net`) | **Scraping Axios+Cheerio** (API oficial de reserva) | No (opcional `SUBSOURCE_API_KEY`) |
| Sub-Scene (`sub-scene.com`) | Scraping (base genérica) | No |
| YTS-Subs (`yts-subs.com`) | Scraping (base genérica) | No |
| JustSubtitles (`justsubtitles.com`) | Scraping (base genérica) | No |
| IndexSubtitle (`indexsubtitle.cc`) | Scraping (base genérica) | No |

> **Sé realista con el scraping:** los sitios cambian su HTML y varios están
> detrás de Cloudflare (responderán 403/reto JS y ese proveedor devolverá
> `[]`). Los parsers de SubDL/SubSource se basan en la estructura verificada
> de sus webs y están cubiertos por tests con fixtures; si un sitio cambia,
> el arreglo suele ser ajustar en su archivo los patrones de URL/selectores.
> Solo JustSubtitles sigue en la base genérica (`src/providers/_scraper.js`).

## ¿No aparece ningún subtítulo en Stremio?

Revisa esto EN ORDEN; cubre el 95 % de los casos:

1. **Comprueba el manifest del addon.** La URL de Subtítulos Plus
   tiene que responder un JSON con `"resources": ["subtitles"]`:

   ```bash
   curl -s https://TU-SERVICIO.onrender.com/manifest.json
   curl -s https://TU-SERVICIO.onrender.com/health
   ```

   Si el primero devuelve `Not Found` (404), el servicio no está desplegado o
   el nombre del subdominio no es ese: Stremio no tiene a quién preguntar.

2. **Los subtítulos se eligen DENTRO del reproductor**, no en la ficha del
   título. Abre un capítulo/película, pulsa el icono de subtítulos (CC) y
   aparecerá el nombre del addon con sus resultados.

3. **El plan gratuito de Render se duerme.** Si nadie ha usado el addon en
   ~15 minutos, la primera petición puede tardar 30-60 s y Stremio se rinde
   antes (se ve como "no hay subtítulos"). Abre antes `/health` en el navegador
   para despertarlo; las siguientes peticiones ya responden en segundos.

4. **Prueba el diagnóstico del propio addon**, que ejecuta las 6 fuentes de
   verdad y dice cuántos resultados y cuánto tarda cada una:

   ```
   https://TU-SERVICIO.onrender.com/selftest?id=tt0111161&type=movie
   https://TU-SERVICIO.onrender.com/selftest?id=tt0944947:1:3&type=series
   https://TU-SERVICIO.onrender.com/selftest?id=kitsu:1234:5&type=series
   ```

   - `ok: true` y `total > 0`: el addon funciona; el problema está en la app
     (addon no instalado en este perfil, caché de Stremio, reproductor
     externo…).
   - `total: 0` con todos los proveedores en `count: 0`: los sitios están
     bloqueando la IP del servidor. Configura `SUBDL_API_KEY` y
     `SUBSOURCE_API_KEY` (son gratis) para tener las APIs oficiales de
     respaldo.
   - Algún proveedor con `"ok": false`: ese sitio ha cambiado o da 403; los
     demás siguen aportando.

5. **Comprueba la petición exacta de Stremio**:

   ```bash
   curl -s "https://TU-SERVICIO.onrender.com/subtitles/movie/tt0111161.json"
   curl -s "https://TU-SERVICIO.onrender.com/subtitles/series/tt0944947%3A1%3A3.json"
   ```

   Debe devolver `{"subtitles":[{"id":…,"url":…,"lang":…}, …]}`.

> **Importante:** el addon ya **no cachea respuestas vacías**. Antes, un fallo
> puntual (Render despertando, timeout, Cloudflare) dejaba el menú de
> subtítulos vacío durante 6 horas. Ahora solo se cachean listas con
> resultados, y el handler responde en un máximo de `HANDLER_DEADLINE_MS`
> (9 s por defecto) aunque alguna fuente se cuelgue.

## Archivo principal: `index.js`

Todo el flujo del addon vive en el `index.js` de la raíz del subproyecto
(`npm start` = `node index.js`). En resumen, su esqueleto es exactamente este:

```js
const builder = new addonBuilder(manifest);

builder.defineSubtitlesHandler(async ({ type, id, extra = {} }) => {
  // 1) ID de Stremio: tt0111161 | tt0944947:1:3 | kitsu:1234:5
  const parsed = parseMediaId(id);
  if (!parsed || !['movie', 'series'].includes(type)) return { subtitles: [] };

  //    2) anime kitsu/mal/anidb -> tt… equivalente (índice Fribb), y
  //       título/año vía Cinemeta (o Kitsu) para los scrapers por texto.
  const deadlineAt = Date.now() + config.handlerDeadlineMs;  // 9 s
  const query = await resolveQuery(type, id, deadlineAt);

  // 3) TODAS las fuentes en paralelo, con fecha límite global:
  //    una fuente lenta NO bloquea la respuesta a Stremio.
  const { subtitles } = await runProviders(query, deadlineAt);

  // 4) Cada URL se firma como https://…/sub/{token}.srt (proxy que
  //    descomprime y sirve el SRT en UTF-8 con CORS).
  return { subtitles };
});

app.use(createProxyRouter());                   // /sub/{token}.srt
app.use(getRouter(builder.getInterface()));     // /manifest.json y /subtitles/…
app.listen(7000, '0.0.0.0');                    // puerto 7000 (o $PORT)
```

El puerto se puede cambiar con `PORT` (las plataformas tipo Render lo fijan
ellas); en local, sin `PORT`, es **7000**. El handler también está exportado
(`handleSubtitlesRequest`) para los tests, y el servidor solo hace `listen()`
cuando `index.js` es el programa principal — por eso `src/addon.js` puede
reexportar la interfaz sin arrancar nada.

## Cómo scrapean SubDL y SubSource

Ambos buscadores web buscan por **título**, no por IMDb ID (el
`/search/tt0111161` de SubDL devuelve 0 resultados y el de SubSource carga por
JS). Por eso el handler resuelve primero `tt… → título + año` con
[Cinemeta](https://v3-cinemeta.strem.io) (el metaddon oficial de Stremio) y
pasa `title`/`year` a los proveedores.

**SubDL** (`src/providers/subdl.js`):
`GET /search/{título}` → tarjeta `/subtitle/sd…/{slug}` (se elige por
tipo/año/título) → para series, página de temporada
(`first-season`, `specials-season` = T0) → páginas por idioma
(`/{english}`, `/{spanish}` según `SUBTITLE_LANGUAGES`). Cada entrada enlaza
el **release** (`/s/info/{código}`) con su *Quick Download*
(`dl.subdl.com/subtitle/{n}-{n}.zip`); para los `MAX_DETAIL_FETCHES` primeros
candidatos se abre la ficha `/s/info/` y se sustituye el `.zip` por el archivo
individual (`dl.subdl.com/subtitle/{código}/{archivo}`), corrigiendo además
idioma y release. Se filtran los releases que no coinciden en temporada/episodio.

**SubSource** (`src/providers/subsource.js`):
se construye el slug (`/subtitles/{slug}-{año}` o
`/subtitles/{slug}/season-{n}`) y se **verifica** que la página enlaza al
mismo `tt…` en IMDb antes de aceptarla. El listado es una tabla
(*Language | Release Name | …*) con enlaces
`/subtitle/{slug}/{idioma}/{id}`; un mismo subtítulo aparece una vez por
release compatible, así que deduplicamos por `id`. Para cada candidato
(priorizando tus idiomas y el episodio exacto) se abre la ficha y se extrae
el enlace firmado `api.subsource.net/v1/subtitle/download/{token}`.

**Headers:** `src/utils/http.js` centraliza un *User-Agent* de Chrome real,
`Accept`, `Accept-Language`, `Accept-Encoding` (gzip/deflate, sin brotli),
`Referer` encadenado búsqueda → ficha → detalle, timeout y límite de tamaño,
además de detectar el reto de Cloudflare y abortar limpio en ese caso.

**Errores:** cada proveedor envuelve TODO su `search()` en `try/catch`
(etapas internas incluidas) y devuelve `[]` si algo falla; el agregador usa
`Promise.allSettled`, así que un sitio caído jamás tumba el addon ni bloquea
a los demás. Stremio siempre recibe `{ id, url, lang }` o una lista vacía.

Probar un scraper suelto desde tu máquina (con internet normal):

```bash
cd subtitles-addon
node -e "require('./src/providers/subdl').search({type:'movie',imdbId:'tt0111161',title:'The Shawshank Redemption',year:1994}).then(r=>console.log(JSON.stringify(r,null,2)))"
node -e "require('./src/providers/subsource').search({type:'series',imdbId:'tt0944947',season:1,episode:3,title:'Game of Thrones',year:2011}).then(r=>console.log(JSON.stringify(r,null,2)))"
```

## YTS-Subs, Subscene e IndexSubtitle

Estos tres exponen además una **API independiente** pensada para llamarse con
el IMDb ID y el idioma deseado, devolviendo ya objetos Stremio `{id,url,lang}`:

```js
const yts = require('./src/providers/ytsSubs');
await yts.getSubtitlesByImdb('tt0111161', 'es');
// [{ id:'yts-subs-125700', url:'https://www.yts-subs.com/subtitle/….zip', lang:'spa' }]

const scene = require('./src/providers/subscene');
await scene.getSubtitlesByImdb('tt0944947', 'spanish', { season: 1, episode: 3 });

const idx = require('./src/providers/indexSubtitle');
await idx.getSubtitlesByImdb('tt0111161', 'spa'); // sin idioma u opciones: resuelve solo
```

Peculiaridades de cada URL/flujo (verificadas contra las webs):

- **YTS-Subs** (`ytsSubs.js`, solo películas): ficha directa por IMDb
  `GET /movie-imdb/tt0111161` (sin buscador); tabla
  *Rating | Language | Release | Uploader | Download* donde release y
  download enlazan a `/subtitles/{slug}`, pero la descarga real se construye
  cambiando a singular + `.zip`: `/subtitle/{slug}.zip`. Hay filas
  duplicadas a montones → dedupe por idioma+release quedando el mejor
  rating. Espejos configurables con `YTS_SUBS_BASE_URLS`; reserva:
  `/search/{Título (Año)}`.
  **Importante (verificado en 2026):** el espejo `yifysubtitles.ch` sí sirve
  `/subtitle/{slug}.zip`, pero `www.yts-subs.com` devuelve 404 en esa misma
  ruta (su botón de descarga es JS/formulario). Por eso el espejo `.ch` va
  PRIMERO en la lista por defecto: así los enlaces que se firman para el
  proxy son descargables.
- **Subscene** (`subscene.js`): el `sub-scene.com` actual **no** usa las rutas
  clásicas (`?mac=`). Su `/search` está tras Cloudflare, así que resolvemos
  con el JSON de su caja de búsqueda `GET /suggest?query=…` (`film`/`tv`).
  Las temporadas son títulos propios ("… - First Season"): se pregunta
  `"{Título} - {Ordinal} Season"` primero. Listado en `/subscene/{id}` con
  `<span class="l">` (idioma) y `<span class="new">` (release) dentro de cada
  `/subtitle/{id}`; descarga construible sin ficha: `GET /download/{id}`.
- **IndexSubtitle** (`indexSubtitle.js`): slugs estilo SubSource, verificados
  con el enlace IMDb de la ficha. La tabla visible es un DataTables cuyos
  enlaces (`#download`) no sirven: la lista completa va **embebida en JSON**
  dentro de un `<script>` (`data: [{"title","language","url",…}], columns`)
  junto a un `ttl = …`. Cada descarga necesita token:
  `POST /subtitlesInfo {id, lang, url}` → `{token}` →
  `/d/{id}/{ttl}/{token}/{zipName}.zip` con el `zipName` exacto del JS del
  sitio (`url.replace(/[^\w ]/,'').replace(/\//g,'_')`). Reserva de búsqueda:
  `POST /search {query}`. Mantiene cookies de sesión durante la búsqueda y
  se detiene con lo obtenido si el sitio devuelve 429 (rate-limit ~5 req/10 s).

## Estructura

```
subtitles-addon/
├── manifest.json          # Fuente de verdad del manifest (lo sirve el SDK en /manifest.json)
├── package.json
├── .env.example           # Copia a .env y pon tus API keys
├── index.js               # PRINCIPAL: builder + defineSubtitlesHandler + Express :7000
├── src/
│   ├── manifest.js        # Carga manifest.json
│   ├── addon.js           # Shim de compatibilidad: reexporta la interfaz de index.js
│   ├── config.js          # Variables de entorno centralizadas
│   ├── cache.js           # Caché en memoria con TTL (nunca guarda listas vacías)
│   ├── proxy.js           # /sub/{token}.srt: descarga, descomprime y sirve UTF-8/SRT
│   ├── utils/
│   │   ├── http.js        # Axios: headers de navegador, getHtml(), anti-Cloudflare
│   │   ├── imdb.js        # Parser histórico de "tt0111161" / "tt0944947:1:3"
│   │   ├── mediaId.js     # tt…/kitsu:/mal:/anidb: -> IMDb (índice de anime + Kitsu)
│   │   ├── token.js       # Firma HMAC de los enlaces del proxy (sin estado)
│   │   ├── zip.js         # Lector ZIP mínimo (store + deflate), sin dependencias
│   │   ├── subtitleText.js # Codificaciones (UTF-8/UTF-16/CP1252) y ASS/VTT/MicroDVD -> SRT
│   │   ├── cinemeta.js    # tt… -> título/año (para buscadores por texto)
│   │   ├── release.js     # SxxExx, packs de temporada, slugs de título
│   │   └── languages.js   # Idiomas a ISO 639-2 (eng, spa...) + slugs (english...)
│   └── providers/
│       ├── index.js       # Agregador: allSettled + normalize {id,url,lang}
│       ├── subdl.js       # Scraping completo (+ API de reserva)
│       ├── subsource.js   # Scraping completo (+ API de reserva)
│       ├── subscene.js    # Scraping completo (/suggest + /download/{id})
│       ├── ytsSubs.js     # Scraping completo (/movie-imdb/tt… -> .zip)
│       ├── indexSubtitle.js # Scraping completo (JSON embebido + token)
│       └── justSubtitles.js # Base genérica _scraper.js (pendiente)
└── test/
    ├── addon.test.js      # Manifest, parser de IDs, idiomas
    ├── index.test.js      # Handler, unificación/prioridad de idiomas y humo HTTP
    ├── core.test.js       # IDs de anime, tokens, zip, formatos y deadline
    ├── scrapers.test.js   # Parsers SubDL/SubSource con fixtures, sin red
    └── scrapers-remaining.test.js # Parsers YTS/Subscene/IndexSubtitle, sin red
```

**Contrato de un proveedor** (así de simple es añadir el séptimo):

```js
// src/providers/miSitio.js
async function search({ type, imdbId, season, episode, title, year }) {
  try {
    // id opcional (el agregador lo prefija); release/archive son internos
    return [{ id: '123', url: 'https://…/sub.srt', lang: 'spa', release: 'Movie.2024.1080p', provider: 'misitio' }];
  } catch {
    return []; // nunca propagues: el addon debe seguir con las demás fuentes
  }
}
module.exports = { name: 'misitio', search };
```

Regístralo en `src/providers/index.js` y listo. El agregador normaliza cada
resultado a exactamente `{ id, url, lang }`, garantiza ids únicos y descarta
URLs duplicadas.

## Instalación (terminal)

Requiere **Node.js 18+** (recomendado 20/22).

```bash
cd subtitles-addon
npm install
cp .env.example .env     # edita .env y pega SUBDL_API_KEY / SUBSOURCE_API_KEY
npm test                 # opcional: verifica manifest y utilidades
npm start                # o: npm run dev  (nodemon, recarga al guardar)
```

Comprueba que responde:

```bash
curl http://localhost:7000/manifest.json
curl http://localhost:7000/health
curl "http://localhost:7000/subtitles/movie/tt0111161.json"
curl "http://localhost:7000/subtitles/series/tt0944947%3A1%3A3.json"

# Diagnóstico: cuántos subtítulos aporta cada fuente y cuánto tarda
curl "http://localhost:7000/selftest?id=tt0111161&type=movie"
```

En local no hay `PUBLIC_BASE_URL`, así que se devuelven los enlaces originales
del sitio (el proxy `/sub/…` solo se activa cuando el addon conoce su URL
pública). Para probarlo en local:

```bash
PUBLIC_BASE_URL=http://localhost:7000 SUBTITLE_TOKEN_SECRET=un-secreto-largo npm start
```

Para instalarlo en Stremio pega `http://localhost:7000/manifest.json` en el
buscador de la app de escritorio, o despliega el servidor (Render, Railway,
Hugging Face Spaces, BeamUp de Stremio…) e instala la URL pública terminada
en `/manifest.json`. En esas plataformas define `SUBDL_API_KEY` /
`SUBSOURCE_API_KEY` como variables de entorno — nunca las subas a Git.

## Despliegue gratuito en Render

El addon ya está preparado para Render:

- `index.js` escucha en `Number(process.env.PORT) || 7000` y en `0.0.0.0`.
  Render asigna `PORT` dinámicamente: **no lo definas tú** ni en el código
  ni en el panel.
- `package.json` ya trae el script que Render ejecutará:
  `"start": "node index.js"`.
- El `render.yaml` de la raíz del repo declara este Web Service
  (`addon5-subtitles`, `rootDir: subtitles-addon`, health check `/health`).

Con un **Web Service manual** en el dashboard de Render usa exactamente:

| Campo | Valor |
|---|---|
| Repository | `noe359866-code/ADDON5` |
| Branch | `main` (tras mergear) o la rama que quieras desplegar |
| Root Directory | `subtitles-addon` |
| Runtime | `Node` |
| Build Command | `npm ci --omit=dev` (o `npm install`) |
| Start Command | `npm start` |
| Instance Type | `Free` |
| Health Check Path | `/health` |

Variables de entorno en Render → *Environment*: `NODE_ENV=production`,
`NODE_VERSION=20`, `SUBTITLE_LANGUAGES=ES,EN`,
`SUBTITLE_LANGUAGES_ONLY=false` y, solo si las tienes,
`SUBDL_API_KEY` / `SUBSOURCE_API_KEY`.

Añade también **`SUBTITLE_TOKEN_SECRET`** (cadena aleatoria de 32+ caracteres,
p. ej. `openssl rand -hex 32`). Firma los enlaces `/sub/…` del proxy: si no la
defines se genera una al azar en cada arranque y los subtítulos que estuvieran
cargados dejan de valer tras un reinicio/deploy. El `render.yaml` del repo ya
la genera automáticamente (`generateValue: true`). Tras el primer deploy, tu URL de
instalación en Stremio será
`https://addon5-subtitles.onrender.com/manifest.json` (el subdominio será
el nombre que elijas para el servicio). En el plan gratuito el servicio se
duerme tras un rato sin tráfico y la primera petición puede tardar
~1 minuto en despertarlo: es normal; las siguientes ya responden rápido.

## Cómo decide Stremio llamarte (el manifest)

```json
"resources": ["subtitles"],
"types": ["movie", "series"],
"idPrefixes": ["tt", "kitsu", "mal", "anidb"]
```

Con esos `idPrefixes` recibes películas/series por IMDb y también anime de los
catálogos que usan IDs de Kitsu/MAL/AniDB (el addon resuelve su `tt…`
equivalente con el índice público de Fribb). No necesitas implementar `meta`
ni `catalog`: los metadatos los aporta Cinemeta. Por eso `catalogs` va vacío.
El SDK sirve este mismo archivo en `GET /manifest.json` a través de
`getRouter()` — no hay que crear esa ruta a mano.

## Variables de entorno

| Variable | Defecto | Uso |
| --- | --- | --- |
| `PORT` | `7000` | Puerto HTTP (Render lo asigna solo). |
| `PUBLIC_BASE_URL` | — | URL pública del addon. En Render se toma de `RENDER_EXTERNAL_URL`. Sin ella el proxy `/sub/…` queda desactivado. |
| `SUBTITLE_TOKEN_SECRET` | aleatorio | Secreto HMAC de los enlaces de descarga. Defínelo para que sobrevivan reinicios. |
| `SUBTITLE_PROXY` | `true` | `false` devuelve los enlaces originales de los sitios (sin descomprimir ni CORS). |
| `SUBTITLE_LANGUAGES` | `ES,EN` | Idiomas preferidos (orden de prioridad). |
| `SUBTITLE_LANGUAGES_ONLY` | `false` | `true` descarta el resto de idiomas. |
| `HANDLER_DEADLINE_MS` | `9000` | Presupuesto total de una petición de Stremio. |
| `PROVIDER_TIMEOUT_MS` | `5000` | Timeout de cada petición HTTP a un sitio. |
| `MAX_DETAIL_FETCHES` | `4` | Fichas de detalle que abre cada proveedor (más = más lento). |
| `CACHE_TTL_SECONDS` | `21600` | TTL de la caché (solo se guardan listas con resultados). |
| `SUBDL_API_KEY` / `SUBSOURCE_API_KEY` | — | APIs oficiales de respaldo (gratis). |
| `ANIME_MAPPING_ENABLED` | `true` | Resuelve `kitsu:`/`mal:`/`anidb:` a IMDb con el índice de Fribb. |
| `ANIME_MAPPING_URLS` | Fribb mini | Una o varias URLs (separadas por comas) del índice de anime. |
| `YTS_SUBS_BASE_URLS`, `SUBSCENE_BASE_URL`, `INDEXSUBTITLE_BASE_URL` | — | Espejos si un dominio cambia. |

## Siguientes pasos

1. **Scraper real para JustSubtitles**: es la única fuente que sigue con la
   base genérica `_scraper.js`; replica el patrón de las demás (resolver
   ficha → parsear listado → enlace/token de descarga).
2. **Ranking fino**: usa `extra.filename` para puntuar subtítulos cuyo
   *release* coincida con el del vídeo (1080p.WEB-DL, etc.). Hoy ya se usa
   para elegir el archivo correcto dentro de un `.zip`, pero no para ordenar
   la lista que ve el usuario.
3. **Cookies de sesión en el proxy**: algunos sitios firman la descarga contra
   su sesión. Guardar el cookie-jar del scraping y reenviarlo en `/sub/…`
   haría más robustas esas descargas.
4. **API keys por usuario**: la configuración de idiomas ya está disponible
   en `/configure`; las claves de proveedores siguen siendo del servidor.

## Configuración por usuario

Visita `/configure`, elige de 1 a 8 idiomas y el modo de filtrado, e instala el
manifest personalizado que genera la página. Las rutas de esa instalación
incluyen la selección y no modifican las variables de entorno ni la selección
de otros usuarios. El manifest anuncia `behaviorHints.configurable: true`.
La URL sin configuración sigue usando los valores por defecto del servidor.
