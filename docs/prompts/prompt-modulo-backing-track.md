# Prompt para Claude Code — Módulo de Backing Tracks

> Copiá este documento completo y entregáselo a Claude Code dentro del repositorio
> `Dmr343/guitar`. Está escrito como una instrucción ejecutable: contexto,
> requerimientos, arquitectura, restricciones y orden de construcción.

---

## 0. Antes de escribir una sola línea de código

Primero **leé y entendé el código existente** del repositorio, en particular la
herramienta del *Intervalic Atlas* dentro de `tools/`. Necesito que identifiques:

1. La **estructura de datos** con la que el Atlas representa una progresión de
   acordes y las notas de cada acorde (nombres de propiedades, formato de las
   notas, octavas, etc.).
2. Cómo está organizado el HTML/JS actual (vanilla JS, módulos ES, scripts
   sueltos, convenciones de nombres).
3. El estilo visual existente (CSS, paleta, tipografía) para que el módulo nuevo
   sea coherente.

No inventes el modelo de datos del Atlas: **adaptá el módulo a lo que ya existe**.
Si algo es ambiguo, documentá el supuesto en un comentario y seguí.

---

## 1. Objetivo

Construir un **módulo de backing tracks** para práctica de guitarra. Sirve para
generar un acompañamiento (bajo, acordes, batería, percusión, sintetizadores,
pads) sobre el cual el usuario improvisa, siguiendo los cambios de acorde.

El módulo se construye sobre **Tone.js** (Web Audio API), ya que el repositorio
es una app web (HTML + JavaScript).

---

## 2. Restricciones DURAS (no negociables)

1. **Módulo completamente separado.** Vive en su propia carpeta
   (`tools/backing-track/`). **No modificar ni romper** la herramienta del
   Intervalic Atlas ni ninguna otra parte existente del repositorio. Si hoy el
   usuario quiere usar solo lo que ya existe, debe poder hacerlo exactamente
   igual que antes.
2. **El módulo debe funcionar de forma autónoma.** Tiene su propio `index.html`
   y se puede abrir y usar sin depender del Atlas (el usuario puede ingresar una
   progresión manualmente dentro del propio módulo).
3. **Integración opcional, no obligatoria.** El módulo además debe poder
   *recibir* una progresión desde el Intervalic Atlas (ver sección 8), pero esa
   integración no debe ser un requisito para que el módulo funcione.
4. **Sin build tooling pesado** salvo que sea estrictamente necesario. Mantener
   el espíritu del repo: HTML + JS plano / módulos ES nativos. Tone.js se puede
   cargar por CDN o como dependencia local, lo que sea más simple y coherente.
5. **Separación motor / datos** (ver sección 4). Esta es la decisión
   arquitectónica central; respetala estrictamente.

---

## 3. Concepto musical (contexto para que las decisiones de diseño sean correctas)

- El backing track es **estático y se repite en loop** con **tempo fijo**. Esa
  repetición es deseada: es un metrónomo armónico para improvisar encima.
- Lo que **no** debe ser repetitivo es la **paleta de sonidos entre sesiones**.
  El usuario no quiere quedarse atado a un único bajo, una única batería, etc.
  Debe poder elegir, editar, crear y guardar distintos sonidos, y combinarlos
  distinto en cada track o cada sesión.
- El módulo tiene **dos modos**:
  - **Modo práctica:** acompañamiento estático, con indicador visual del acorde
    actual (una "muleta" para aprender la progresión).
  - **Modo arreglo:** un espacio para modificar groove, densidad, dinámica y
    voicings, y escuchar cómo cada decisión cambia el resultado. Es donde el
    usuario aprende producción/arreglo.

---

## 4. Arquitectura — separación MOTOR / DATOS

Esta es la idea rectora. Separar dos capas que parecen una sola:

- **Motor (código fijo):** el reloj (`Tone.Transport`), el scheduling de
  eventos (`Tone.Part` / `Tone.Loop`), el loop, el manejo de modos. Se escribe
  una vez.
- **Instrumentos (datos):** qué oscilador, qué envolvente ADSR, qué filtro, qué
  efectos. Son **objetos de configuración** (presets). El motor no conoce
  sonidos concretos; recibe presets y construye instrumentos a partir de ellos.

Gracias a esto, agregar un sonido nuevo = agregar una entrada de datos, sin
tocar el motor.

### Estructura de archivos sugerida

```
tools/backing-track/
  index.html        Entrada autónoma del módulo
  styles.css        Estilos (coherentes con el repo)
  engine.js         Motor: Transport, scheduling, loop, modos
  instruments.js    Fábrica: construye instrumentos Tone.js desde un preset
  presets.js        Librería de presets de fábrica (solo datos)
  patterns.js       Patrones rítmicos / grooves (solo datos)
  storage.js        Persistencia en localStorage (presets y proyectos)
  ui.js             Interfaz: controles, dropdowns, panel de edición
  integration.js    Hook opcional para recibir progresión del Atlas
```

Ajustá nombres/organización a las convenciones que encuentres en el repo.

---

## 5. Instrumentos — agregables y quitables a voluntad

El motor **no** debe tener un número fijo de instrumentos. Debe manejar una
**lista dinámica de pistas de instrumento** ("tracks"). El usuario puede
**agregar y quitar pistas a su antojo**.

Cada pista de instrumento es un objeto con, al menos:

- `id` único
- `tipo`: `bajo` | `acordes` | `bateria` | `percusion` | `pad` | `lead`
- `presetId`: cuál preset de la librería usa
- `enabled`: activa/silenciada
- `volumen`
- `patternId`: qué patrón rítmico usa (cuando aplique)

La interfaz debe permitir: **+ Agregar instrumento** (elegir tipo y preset),
quitar una pista, silenciar/activar, y reordenar. El motor reconstruye el
scheduling según la lista actual de pistas.

### Tipos de síntesis por instrumento (enfoque híbrido)

- **Bajo:** `Tone.MonoSynth` (oscilador + filtro + envolventes). Toca la
  fundamental del acorde; es el ancla auditiva del cambio.
- **Pad / lead / synth:** `Tone.PolySynth` / `Tone.Synth`. Sintetizados.
- **Acordes:** `Tone.PolySynth` sintetizado **o** `Tone.Sampler` con piano real.
- **Piano:** usar `Tone.Sampler` con samples reales (la síntesis no convence).
  Se puede usar la librería de piano Salamander que distribuye Tone.js.
- **Batería:** `Tone.MembraneSynth` (bombo), `Tone.NoiseSynth` (caja, hi-hat),
  `Tone.MetalSynth` (platillos) — o `Tone.Sampler` con samples de batería.
- **Percusión** (bongós, congas, toms, shakers): `Tone.MembraneSynth` afinado a
  distintos pitches, `Tone.NoiseSynth` con decay corto para shakers, o samples.

El módulo debe soportar **ambas vías** (síntesis y samples) según el preset.

### Efectos

La señal fluye instrumento → efectos → salida, encadenada con `.chain()`.
Soportar al menos: reverb, distorsión y chorus, configurables por preset.

---

## 6. Sistema de presets — TRES NIVELES

El usuario no debe quedar atado a un preset por instrumento. El sistema tiene
tres niveles de profundidad, todos deben implementarse:

1. **Elegir.** Un dropdown por pista permite seleccionar un preset de la
   librería. La librería de fábrica (`presets.js`) trae varias opciones por cada
   tipo de instrumento (p. ej. para bajo: `bajoRedondo`, `bajoPunchy`,
   `bajoSubgrave`).
2. **Editar.** Un **panel de edición** con controles (sliders y selectores) para
   modificar un preset en tiempo real: forma de onda del oscilador, attack,
   decay, sustain, release, frecuencia/Q del filtro, niveles de efectos. Al
   gustarle el resultado, el usuario lo **guarda como preset nuevo** con un
   nombre propio.
3. **Diseñar desde cero.** El mismo panel permite partir de un preset vacío y
   construir un sonido íntegramente moviendo parámetros.

Un preset es un objeto de datos serializable. Ejemplo de forma (adaptá según el
instrumento):

```js
{
  id: "bajoPunchy",
  nombre: "Bajo Punchy",
  tipo: "bajo",
  motor: "synth",            // "synth" | "sampler"
  config: {
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.2 },
    filter: { type: "lowpass", Q: 2 },
    filterEnvelope: { attack: 0.02, decay: 0.3, sustain: 0.2,
                      baseFrequency: 200, octaves: 3 }
  },
  efectos: [ { tipo: "distortion", cantidad: 0.1 } ]
}
```

---

## 7. Persistencia entre sesiones

El usuario debe poder **hacer modificaciones entre sesiones** y reencontrarlas.
Usar `localStorage` (vía `storage.js`). Persistir dos cosas separadas:

1. **Librería de presets del usuario.** Todos los presets que cree o edite y
   guarde. Es global, crece con el tiempo, y está disponible para cualquier
   track.
2. **Proyectos / sesiones.** Cada proyecto guarda: la progresión de acordes, el
   tempo, el modo activo, y la **lista de pistas de instrumento** con su preset,
   patrón, volumen y estado. El usuario puede guardar, nombrar, cargar y borrar
   proyectos.

Importante: un proyecto guarda **qué presets usa** (referencias por `id`), no
los sonidos en sí. Al abrir la app otra sesión, todo queda como se dejó.

Incluir además **exportar/importar** la librería y los proyectos como JSON, para
respaldo y portabilidad.

---

## 8. Integración con el Intervalic Atlas (opcional)

El módulo debe poder **recibir una progresión** generada en el Intervalic Atlas
sin que el Atlas dependa del módulo ni viceversa.

- En `integration.js`, exponer una función clara, p. ej.
  `cargarProgresionDesdeAtlas(progresion)`, que reciba la progresión en la
  estructura de datos nativa del Atlas (la que identificaste en la sección 0) y
  la traduzca al formato que consume el motor.
- El acoplamiento debe ser mínimo: idealmente el Atlas solo necesita un botón
  tipo "Enviar a backing track" o un enlace; el Atlas no debe importar lógica
  del módulo.
- Si para esto hace falta un pequeño punto de enganche en el Atlas, debe ser lo
  más chico y aislado posible, y **no debe alterar el comportamiento actual** de
  esa herramienta.

---

## 9. Los dos modos

### Modo práctica
- Acompañamiento estático en loop, tempo fijo.
- **Indicador visual del acorde actual:** debe resaltarse el acorde que está
  sonando, sincronizado con el callback del `Tone.Part`. Cada vez que el motor
  dispara un acorde, la UI resalta ese acorde de la progresión.
- Controles: play/stop, tempo (BPM), activar/desactivar loop, volumen general y
  por pista.

### Modo arreglo
- Permite modificar la **capa de arreglo** y escuchar el efecto en vivo:
  - Groove / patrón rítmico por pista (desde `patterns.js`).
  - Densidad (qué pistas suenan, entradas/salidas por sección).
  - Dinámica: variación de velocity por nota.
  - Humanización: micro-desplazamientos opcionales de timing/volumen.
  - Voicings de los acordes (inversiones, aperturas).
- El indicador visual puede ocultarse aquí (entrenamiento de oído).

Implementar **primero el modo práctica completo y funcional**, dejando la
arquitectura preparada para el modo arreglo.

---

## 10. Notas técnicas

- El audio en navegador solo arranca tras un gesto del usuario: el botón "Play"
  debe hacer `await Tone.start()` antes de `Tone.getTransport().start()`.
- Usar `Tone.getTransport()` para BPM, loop (`loop`, `loopEnd`) y scheduling.
- Programar los eventos de acordes/bajo con `Tone.Part`; los patrones de batería
  repetitivos con `Tone.Loop` o `Tone.Sequence`.
- Liberar correctamente los nodos de Tone.js (`.dispose()`) al quitar una pista
  o recargar un proyecto, para no acumular instrumentos huérfanos.
- Manejar errores de carga de samples (Sampler) con un fallback claro.
- Código modular, comentado, en español coherente con el repo. Sin dependencias
  innecesarias.

---

## 11. Fuera de alcance (no hacer)

- No modificar ni "mejorar" el Intervalic Atlas más allá del mínimo hook de
  integración descripto en la sección 8.
- No agregar backend ni base de datos: todo es cliente + `localStorage`.
- No grabación de audio ni exportación a WAV/MP3 en esta etapa (se puede dejar
  anotado como mejora futura).

---

## 12. Orden de construcción sugerido

1. Andamiaje: carpeta, `index.html` autónomo, carga de Tone.js, estilos base.
2. `presets.js` y `patterns.js` con datos de fábrica (varios presets por tipo).
3. `instruments.js`: fábrica que construye instrumentos Tone.js desde un preset.
4. `engine.js`: Transport, scheduling de una progresión, loop, lista dinámica de
   pistas. Modo práctica funcionando con play/stop/tempo.
5. `ui.js`: controles, agregar/quitar pistas, dropdowns de presets, indicador
   visual del acorde sincronizado.
6. `storage.js`: persistencia de librería de presets y de proyectos +
   exportar/importar JSON.
7. Panel de edición de presets (niveles 2 y 3) con guardado.
8. `integration.js`: hook para recibir progresión del Atlas.
9. Andamiaje del modo arreglo (groove, densidad, dinámica, voicings).

Entregá el módulo funcional de forma incremental, verificando en cada paso que
el resto del repositorio sigue intacto.

---

## 13. Criterios de aceptación

- [ ] El Intervalic Atlas y el resto del repo funcionan exactamente igual que antes.
- [ ] El módulo de backing track abre y funciona de forma autónoma.
- [ ] Se pueden agregar y quitar instrumentos dinámicamente.
- [ ] Hay varios presets de fábrica por tipo de instrumento.
- [ ] Se puede editar un preset con controles y guardarlo como uno nuevo.
- [ ] Se puede diseñar un preset desde cero.
- [ ] Presets de usuario y proyectos persisten entre sesiones (localStorage).
- [ ] Exportar/importar librería y proyectos como JSON.
- [ ] Modo práctica: loop estático, tempo fijo, indicador visual del acorde
      sincronizado.
- [ ] El módulo puede recibir una progresión del Intervalic Atlas.
- [ ] Arquitectura motor/datos respetada; el motor no conoce sonidos concretos.
