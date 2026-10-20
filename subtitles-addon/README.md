# ADDON5 Subtitles — Addon de subtítulos para Stremio

Addon de Stremio (recurso `subtitles`, películas y series, IDs IMDb `tt…`) que
busca subtítulos **en paralelo** en 6 fuentes y devuelve la unión de resultados.
Si una fuente falla, las demás siguen funcionando: el addon nunca responde con
error a Stremio, en el peor caso responde `{ subtitles: [] }`.

| Fuente | Método | ¿Necesita clave? |
| --- | --- | --- |
| [SubDL](https://subdl.com/api-doc) | API oficial ✅ recomendado | Sí, gratis (`SUBDL_API_KEY`) |
| [SubSource](https://subsource.net/api-docs) | API oficial ✅ recomendado | Sí, gratis (`SUBSOURCE_API_KEY`) |
| Sub-Scene (`sub-scene.com`) | Scraping (cheerio) | No |
| YTS-Subs (`yts-subs.com`) | Scraping (cheerio) | No |
| JustSubtitles (`justsubtitles.com`) | Scraping (cheerio) | No |
| IndexSubtitle (`indexsubtitle.cc`) | Scraping (cheerio) | No |

> **Sé realista con el scraping:** los sitios sin API cambian su HTML y varios
> están detrás de Cloudflare (responderán 403 y ese proveedor devolverá `[]`).
> Los 4 scrapers incluidos son una **base defensiva** (`src/providers/_scraper.js`):
> inspecciona el HTML real de cada sitio y ajusta la ruta de búsqueda y los
> selectores en su archivo. Las dos APIs oficiales son la vía estable.

## Estructura

```
subtitles-addon/
├── manifest.json          # Fuente de verdad del manifest (lo sirve el SDK en /manifest.json)
├── package.json
├── .env.example           # Copia a .env y pon tus API keys
├── index.js               # Entry point: Express + router del SDK + /health
├── src/
│   ├── manifest.js        # Carga manifest.json
│   ├── addon.js           # addonBuilder + defineSubtitlesHandler (con caché)
│   ├── config.js          # Variables de entorno centralizadas
│   ├── cache.js           # Caché en memoria con TTL
│   ├── utils/
│   │   ├── http.js        # Instancia axios compartida (timeout + User-Agent)
│   │   ├── imdb.js        # Parsea "tt0111161" y "tt0944947:1:3" (serie T:E)
│   │   └── languages.js   # Normaliza idiomas a ISO 639-2 (eng, spa...) que pide Stremio
│   └── providers/
│       ├── index.js       # Agregador: Promise.allSettled + dedupe por URL
│       ├── subdl.js       # API oficial
│       ├── subsource.js   # API oficial
│       ├── subscene.js    # Scraping
│       ├── ytsSubs.js     # Scraping
│       ├── justSubtitles.js
│       └── indexSubtitle.js
└── test/
    └── addon.test.js      # node --test (manifest, parser de IDs, idiomas)
```

**Contrato de un proveedor** (así de simple es añadir el séptimo):

```js
// src/providers/miSitio.js
async function search({ type, imdbId, season, episode, filename }) {
  return [{ url: 'https://…/sub.srt', lang: 'spa', provider: 'misitio' }];
}
module.exports = { name: 'misitio', search };
```

Regístralo en `src/providers/index.js` y listo. El agregador le pone un `id`
único y descarta URLs duplicadas.

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

1. **Endpoint de descarga propio** (`/download/:token.srt`): SubDL y SubSource
   entregan `.zip`, pero Stremio necesita la URL del `.srt`. Descarga el zip
   en tu servidor, extrae el `.srt` (p. ej. con `adm-zip`), conviértelo a
   UTF-8 si hace falta y sírvelo desde tu dominio. Por eso este proyecto usa
   Express + `getRouter()` en lugar del `serveHTTP()` "todo en uno" del SDK.
2. **Selectores reales por scraper**: abre cada sitio, mira su buscador con
   DevTools y sustituye la extracción genérica de `_scraper.js`.
3. **Ranking**: usa `extra.filename` para puntuar subtítulos cuyo *release*
   coincida con el del vídeo (1080p.WEB-DL, etc.) y ordénalos antes de responder.
4. **Configuración por usuario** (`behaviorHints.configurable` + `config` en el
   manifest) para que cada quien pegue SUS API keys en la página del addon
   en vez de usar las del servidor.
