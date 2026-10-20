# ADDON5 Subtitles — Addon de subtítulos para Stremio

Addon de Stremio (recurso `subtitles`, películas y series, IDs IMDb `tt…`) que
busca subtítulos **en paralelo** en 6 fuentes y devuelve la unión de resultados.
Si una fuente falla, las demás siguen funcionando: el addon nunca responde con
error a Stremio, en el peor caso responde `{ subtitles: [] }`.

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

## Archivo principal: `index.js`

Todo el flujo del addon vive en el `index.js` de la raíz del subproyecto
(`npm start` = `node index.js`). En resumen, su esqueleto es exactamente este:

```js
const builder = new addonBuilder(manifest);

builder.defineSubtitlesHandler(async ({ type, id, extra = {} }) => {
  // 1) IMDb ID + temporada/episodio: 'tt0944947:1:3' -> tt0944947, S1, E3
  const parsed = parseSubtitlesId(id);
  if (!parsed || !['movie', 'series'].includes(type)) return { subtitles: [] };

  //    (caché TTL) + título/año vía Cinemeta para los buscadores por texto…
  const query = { type, imdbId: parsed.imdbId, season: parsed.season,
                  episode: parsed.episode, title, year, filename: extra.filename };

  // 2) TODAS las fuentes en paralelo: un fallo no tumba a las demás
  const settled = await Promise.allSettled(
    providers.map(async (p) => await p.search(query) ?? [])
  );

  // 3) Unificar: {id,url,lang}, sin duplicados, español > inglés > resto
  const subtitles = unifySettled(settled, providers, {
    preferredLanguages: config.languages,      // SUBTITLE_LANGUAGES=ES,EN
    onlyPreferred: config.languagesOnly        // SUBTITLE_LANGUAGES_ONLY=true filtra
  });

  // 4) La forma exacta que espera Stremio
  return { subtitles };
});

app.use(getRouter(builder.getInterface()));   // sirve /manifest.json y /subtitles/…
app.listen(7000, '0.0.0.0');                    // 5) Puerto 7000 (o $PORT)
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
│   ├── cache.js           # Caché en memoria con TTL
│   ├── utils/
│   │   ├── http.js        # Axios: headers de navegador, getHtml(), anti-Cloudflare
│   │   ├── imdb.js        # Parsea "tt0111161" y "tt0944947:1:3" (serie T:E)
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
`SUBDL_API_KEY` / `SUBSOURCE_API_KEY`. Tras el primer deploy, tu URL de
instalación en Stremio será
`https://addon5-subtitles.onrender.com/manifest.json` (el subdominio será
el nombre que elijas para el servicio). En el plan gratuito el servicio se
duerme tras un rato sin tráfico y la primera petición puede tardar
~1 minuto en despertarlo: es normal; las siguientes ya responden rápido.

## Cómo decide Stremio llamarte (el manifest)

```json
"resources": ["subtitles"],
"types": ["movie", "series"],
"idPrefixes": ["tt"]
```

Con `idPrefixes: ["tt"]` solo recibes peticiones con IDs de IMDb y no
necesitas implementar `meta` ni `catalog`: los metadatos los aporta el addon
Cinemeta de Stremio. Por eso `catalogs` va vacío. El SDK sirve este mismo
archivo en `GET /manifest.json` a través de `getRouter()` — no hay que crear
esa ruta a mano.

## Siguientes pasos (cuando quieras producción de verdad)

1. **Endpoint de descarga propio** (`/download/:token.srt`): estos sitios no
   garantizan un `.srt` suelto — SubDL expone el archivo individual en la
   ficha (ya lo aprovechamos), pero su *Quick Download* y muchos packs son
   `.zip`, y SubSource puede entregar el archivo empaquetado. Stremio solo
   consume la URL del subtítulo, así que el paso de producción es descargar
   en tu servidor, extraer el `.srt` (p. ej. con `adm-zip`), normalizar a
   UTF-8 y servirlo desde tu dominio. Por eso este proyecto usa Express +
   `getRouter()` en lugar del `serveHTTP()` "todo en uno" del SDK. Los
   resultados que siguen siendo zip van marcados internamente (`archive`)
   y ordenados después de los archivos sueltos.
2. **Scraper real para JustSubtitles**: es la única fuente que sigue con la
   base genérica `_scraper.js`; replica el patrón de las demás (resolver
   ficha → parsear listado → enlace/token de descarga).
3. **Ranking**: usa `extra.filename` para puntuar subtítulos cuyo *release*
   coincida con el del vídeo (1080p.WEB-DL, etc.) y ordénalos antes de responder.
4. **Configuración por usuario** (`behaviorHints.configurable` + `config` en el
   manifest) para que cada quien pegue SUS API keys en la página del addon
   en vez de usar las del servidor.
