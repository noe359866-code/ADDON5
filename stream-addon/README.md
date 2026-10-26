# ADDON5 Streams — base stream-only

Plantilla mínima para un addon de Stremio que no declara catálogos ni metadatos. Solo responde a solicitudes de streams para películas y series con IDs IMDb.

## Requisitos

- Node.js 22+
- Usar únicamente fuentes y URLs de reproducción que tengas derecho a distribuir o cuyo acceso esté autorizado.

## Ejecutar

```bash
npm install
npm start
```

El servidor escucha en `PORT` o en el puerto `7000`. Comprueba `/manifest.json` y luego instala esa URL pública HTTPS en Stremio.

## Integrar una fuente autorizada

Implementa `resolveAuthorizedStreams(args)` en `index.js` o impórtala desde un adaptador separado. Debe devolver una lista como:

```js
[
  { name: "Fuente autorizada", title: "1080p · Español", url: "https://media.example.org/video.m3u8" }
]
```

El ejemplo de URL es ilustrativo. El adaptador debe resolver correctamente la película o el episodio solicitado, respetar los términos de la fuente y no devolver páginas HTML del reproductor como si fueran vídeo directo. Esta plantilla no incluye un scraper específico de terceros y, por defecto, devuelve cero streams.

## Pruebas

```bash
npm test
```

El servicio original de subtítulos en la raíz del repositorio no se modifica en esta rama; esta plantilla vive en `stream-addon/`.
