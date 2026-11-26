# 🐦 HitzBidaia · Viaje de Palabras

Una app **progresiva y divertida para aprender a leer en euskera y castellano**, pensada para niños y niñas que empiezan a leer (y para cualquier persona que quiera practicar). No hay cuentas, ni anuncios, ni servidor: todo funciona en el navegador y el progreso se guarda en `localStorage`.

> *Laburpena euskaraz: euskaraz eta gaztelaniaz irakurtzen ikasteko app progresiboa eta jolasgarria, ikusizko eta entzunezko ibilbideekin.*

---

## ✨ Qué incluye

### 6 mundos progresivos
Cada mundo se desbloquea al conseguir al menos **1 estrella** en el anterior:

| # | Mundo | Se practica |
|---|-------|-------------|
| 1 | 🔤 Letras que suenan / Soinua duten letrak | Correspondencia letra–sonido, letras especiales (`tx`, `tz`, `ch`, `ñ`, `rr`, `ll`) |
| 2 | 🧩 El taller de sílabas / Silaben tailerra | Segmentación, conteo y construcción de sílabas |
| 3 | 🍎 Primeras palabras / Lehen hitzak | Lectura y escritura de vocabulario real |
| 4 | 🎵 Rimas y sonidos / Errimak eta soinuak | Rimas, pares mínimos y discriminación auditiva |
| 5 | 💬 Frases que cobran vida / Bizirik dauden esaldiak | Completar, ordenar y escuchar frases |
| 6 | 📖 El bosque de los cuentos / Ipuinen basoa | Cuentos breves con comprensión lectora |

### Rutas de aprendizaje adaptadas
- 👁️ **Visual**: dibujos, sílabas de colores, letras ocultas, piezas para construir palabras y frases.
- 🎧 **Auditiva**: la voz de Luma lee cada pregunta, ejercicios de escucha, rimas, pares mínimos y dictado.
- 🌈 **Mixta**: alterna imagen y sonido pregunta a pregunta.

La ruta se elige al empezar y **se puede cambiar en cualquier momento** desde el mapa o Ajustes: el generador de ejercicios pondera las actividades según la ruta activa.

### Adaptación además de la ruta
- **Dificultad viva**: 3 aciertos seguidos → más opciones y distractores más parecidos; 2 fallos seguidos → baja la dificultad.
- **Dos idiomas**: castellano, euskera o alternando una pregunta de cada (`¡Los dos!`). Cada pregunta muestra su chip `ES` / `EU`.
- **Interfaz bilingüe**: todos los textos de la app en español o en euskera.
- **Pistas** de Luma (con repetición lenta del audio), sin castigo más allá de algo menos de XP.
- **Voz**: Web Speech API (`eu-ES` / `es-ES`). Si el navegador no tiene voz en euskera, se usa la voz en español y se avisa con un cartelito.
- **Efectos de sonido** sintetizados con Web Audio API (sin archivos de audio).

### Diversión y accesibilidad
Mascota animada en SVG, confeti, estrellas, XP, nivel lector, racha diaria, 8 insignias, práctica libre, atajos de teclado (`1`–`4` y `Enter`), modo «letras grandes», soporte de `prefers-reduced-motion` y diseño responsive móvil/escritorio.

En **Ajustes → Desbloquear todos los mundos (demo)** se pueden explorar los 6 mundos sin completarlos.

---

## 🚀 Ejecutar

```bash
npm install
npm run dev        # http://localhost:5173
```

Otros comandos:

```bash
npm run build          # tsc --noEmit + build de producción en dist/
npm run preview        # sirve dist/
npm run typecheck      # solo comprobación de tipos
npm run check:content  # valida 12.960 ejercicios generados (6 mundos × 3 rutas × 3 idiomas × 3 dificultades)
```

Requiere Node.js 18+.

---

## ☁️ Desplegar en Render

La app es una SPA 100 % estática: `npm run build` genera `dist/` y no necesita servidor, base de datos ni variables secretas. El plan **Static Site gratuito** sirve desde CDN con HTTPS incluido (necesario para que funcione la síntesis de voz del navegador).

### Opción A · Blueprint (recomendada)
El archivo [`render.yaml`](./render.yaml) ya define todo:

1. Sube esta rama a GitHub (está lista en `arena/691833fa-addon5`).
2. En [Render Dashboard](https://dashboard.render.com) → **New → Blueprint**.
3. Conecta el repositorio `noe359866-code/ADDON5` y selecciona la rama `arena/691833fa-addon5`.
4. Revisa los recursos y pulsa **Apply**. Render creará el sitio `hitzbidaia.onrender.com`.

> ⚠️ `main` sigue teniendo el repo antiguo. Si fusionas esta rama en `main`, cambia `branch:` en `render.yaml` a `main` antes de desplegar.

### Opción B · Manual
**New → Static Site** → conecta repo y rama, y rellena:

| Campo | Valor |
|---|---|
| Build Command | `npm ci --include=dev && npm run build` |
| Publish Directory | `dist` |
| Node version | `22` (variable `NODE_VERSION`) |
| Rewrite rule | `/*` → `/index.html` |

`--include=dev` es clave: Vite y TypeScript están en `devDependencies` y Render construye con `NODE_ENV=production`.

### Notas
- No hay secretos, ni `.env`, ni backend: el progreso de cada jugador se guarda en su propio navegador (`localStorage`).
- La voz (`eu-ES` / `es-ES`) depende de las voces instaladas en el dispositivo; si falta la voz en euskera la app usa la española y lo avisa.
- El sitio estático gratuito no se "duerme": se sirve desde la CDN de Render.

---

## 🗂️ Estructura

```
index.html
src/
  main.tsx           arranque React + fuentes
  App.tsx            estado global, pantallas y persistencia
  screens.tsx        onboarding, mapa, ajustes y resultados
  GameScreen.tsx     bucle de juego, feedback, pistas, adaptación y teclado
  exercises.ts       generadores de ejercicios por mundo y selección por ruta
  data.ts            banco bilingüe de ~50 palabras, sílabas, rimas, frases, cuentos, insignias
  i18n.ts            todos los textos de interfaz en es/eu
  progress.ts        progreso en localStorage, estrellas, racha, insignias
  sound.ts           síntesis de voz (SpeechSynthesis) y efectos (Web Audio)
  components.tsx     mascota SVG, confeti, estrellas, barras y modal
  types.ts
  styles.css
scripts/check-exercises.mjs
```

### Cómo se genera un ejercicio
`pickExercise()` recibe `{ levelId, lang, ui, route, difficulty, slot, state }`, elige una fábrica del mundo según la modalidad preferida por la ruta (con un 16 % de actividades de la otra ruta para variar) y evita repetir contenido dentro de la sesión. Las fábricas devuelven ejercicios de cuatro tipos: `choice`, `tap`, `build` y `story`.

### Sobre el contenido
El banco de palabras usa formas de diccionario (`katu`, `sagar`, `etxe`…) para mantener las sílabas claras en ambos idiomas. Las rimas en euskera son asonantes, como suele hacerse en material infantil. Los cuentos son originales y breves, con una pregunta de comprensión cada uno.

---

## 🔒 Privacidad

Sin backend, sin analítica, sin cuentas. Solo `localStorage` (`hitzbidaia.progress.v1`). **Ajustes → Borrar progreso** reinicia todo.

Hecho con React + TypeScript + Vite. 💜
