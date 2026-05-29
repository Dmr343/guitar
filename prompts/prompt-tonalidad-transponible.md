# Prompt para Claude Code — Tonalidad transponible en progresiones

> Pegá este documento a Claude Code dentro del repositorio `Dmr343/guitar`.
> Trabajá en una rama nueva: `git checkout -b tonalidad-transponible`.
> Es una refactorización de modelo de datos + UI. Toca varios archivos.

---

## 0. Objetivo

Hoy las progresiones de fábrica guardan acordes con raíz fija (Cmaj7, Dm7, …).
Para escuchar la "Armonización de Do mayor" en Sol, hay que editarla acorde por
acorde. El objetivo es guardar los acordes como **grados** respecto a una
tonalidad, y transponer toda la progresión cambiando un solo selector.

Comportamiento final:

- Cada progresión declara su **tonalidad nativa** (la tonalidad en la que está
  pensada y suena como debe). Al cargarla, la sesión adopta esa tonalidad
  automáticamente.
- Hay un **selector de tonalidad** en la UI, **junto al desplegable "De
  fábrica"** (no global). Cambiar el selector mientras suena transpone los
  acordes en vivo, cuantizado al próximo compás para que no haya cortes.
- Un **botón "↻"** al lado del selector vuelve a la tonalidad nativa de la
  progresión cargada.
- Los proyectos guardados siguen funcionando (compatibilidad hacia atrás).

---

## 1. Modelo de datos

### 1.1 Cómo se escribe un acorde en `progressions.js`

Usamos **grados romanos clásicos** como cadena, con extensión para casos no
diatónicos. El formato es expresivo y compacto:

```
'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'        // diatónicos mayores
'i', 'ii°', 'III', 'iv', 'v', 'V', 'VI', 'VII'   // diatónicos menores
'bII', 'bIII', 'bVI', 'bVII'                     // grados bemolados
'#IV'                                            // ocasional, raro
'V/ii', 'V/V', 'V/vi'                            // dominantes secundarios
```

Reglas de la cadena:

- **Mayúscula = mayor**, **minúscula = menor**, **°** = disminuido.
- **`b` o `#` adelante** altera el grado (semitono abajo/arriba). Ej.: `'bIII'`
  en Do = E♭ (mayor); `'bVII'` en Do = B♭ (mayor).
- **`/X`** denota "dominante secundario hacia X": `'V/ii'` = el V del ii.
- El grado define **raíz y cualidad básica**. La cualidad fina (séptima,
  semidisminuido, etc.) sigue yendo en un campo `quality` aparte, **igual que
  hoy**: `maj7`, `min7`, `dom7`, `m7b5`, `major`, `minor`. Esto evita explotar
  el lenguaje de grados con todas las extensiones.

**Formato de un acorde:**

```js
{ grado: 'I', quality: 'maj7', bars: 1 }
{ grado: 'V/ii', quality: 'dom7', bars: 1 }
{ grado: 'bIII', quality: 'maj7', bars: 1 }
```

### 1.2 Formato de una progresión

```js
{
  id: 'armonizacionCmaj',
  nombre: 'Armonización de Do mayor',
  categoria: 'estudio',
  genero: 'estudio',
  tempo: 80,
  tonalidad: 'C',           // tonalidad nativa
  modo: 'major',            // 'major' | 'minor' — referencia tonal de los grados
  chords: [
    { grado: 'I',   quality: 'maj7', bars: 1 },
    { grado: 'ii',  quality: 'min7', bars: 1 },
    { grado: 'iii', quality: 'min7', bars: 1 },
    { grado: 'IV',  quality: 'maj7', bars: 1 },
    { grado: 'V',   quality: 'dom7', bars: 1 },
    { grado: 'vi',  quality: 'min7', bars: 1 },
    { grado: 'vii°',quality: 'm7b5', bars: 1 },
  ],
}
```

Sobre `modo`: define respecto a qué escala se interpretan los números. En
`major` los grados naturales son I=mayor, ii=menor, iii=menor, IV=mayor,
V=mayor, vi=menor, vii°=dim. En `minor` (natural), i=menor, ii°=dim, III=mayor,
iv=menor, v=menor, VI=mayor, VII=mayor. **Las mayúsculas/minúsculas en el
grado deben coincidir con lo que el modo predice**; si no coinciden, es porque
es un préstamo (préstamo modal o secundario).

### 1.3 La función núcleo: `realizeProgression(prog, tonalidad)`

Implementala en un módulo nuevo `tools/backing-track/transpose.js` (ES5,
namespace `BackingTrack.transpose`, IIFE, file:// safe). Su firma:

```js
realizeProgression(prog, tonalidad) → [{ root, quality, bars }, ...]
```

Toma una progresión en el nuevo formato y una tonalidad destino (string como
`'C'`, `'F#'`, `'Bb'`) y devuelve la lista de acordes con raíces concretas,
**idéntica en forma a lo que hoy consume el motor**. Esto es lo que mantiene
el motor intacto: la fábrica de progresiones realiza el grado y le entrega al
engine acordes ya con `root`.

Algoritmo:

1. Calcular el semitono de cada grado respecto a la nueva tónica:
   - Mapa base por modo (sin alteraciones):
     - `major`: I=0, ii=2, iii=4, IV=5, V=7, vi=9, vii°=11.
     - `minor`: i=0, ii°=2, III=3, iv=5, v=7, VI=8, VII=10.
   - Si el grado tiene `b` adelante: restar 1 semitono al grado base.
   - Si tiene `#` adelante: sumar 1.
   - Si tiene `/X` (dominante secundario): el grado base es el de X en el
     modo activo, y se le suma 7 semitonos (la quinta del X) — un V/ii en C
     mayor: ii=D=2 semitonos, +7 = 9 semitonos = A. Quality del resultado:
     usar la `quality` que viene en el acorde (típicamente `dom7`), no la
     del grado base.
2. Sumar el semitono base a la tonalidad destino para obtener el MIDI/nombre
   de la raíz final. Usar la ortografía coherente con la tonalidad destino:
   en tonalidades de bemoles, escribir bemoles (`Eb`, `Ab`); en tonalidades de
   sostenidos, sostenidos (`F#`, `C#`). Mapa sugerido por tonalidad:
   - Bemoles: F, Bb, Eb, Ab, Db, Gb → usar bemoles.
   - Sostenidos: G, D, A, E, B, F# → usar sostenidos.
   - C: sin preferencia, usar la que sea correcta enarmónicamente.
3. Devolver `{ root, quality, bars }` por acorde.

**Test sugerido (`transpose.test.js`):** correr la armonización en C, en G y
en Eb, y verificar que el primer acorde sea Cmaj7, Gmaj7, Ebmaj7
respectivamente; el último, Bm7b5, F#m7b5, Dm7b5. También: un `'V/ii'` con
`quality: 'dom7'` en C debe dar A7; en G debe dar B7.

---

## 2. Migración del catálogo

Migrar las 34 progresiones de `progressions.js` al nuevo formato. La mayoría
son fácilmente analizables como grados. Te paso el mapeo completo abajo. Cada
progresión gana `tonalidad` (nativa) y `modo`, y cada acorde reemplaza `root`
por `grado`. **No cambies `id`, `nombre`, `categoria`, `genero`, `tempo` ni el
campo `bars` de cada acorde.**

### 2.1 Estudio

- **armonizacionCmaj** — tonalidad: `'C'`, modo: `'major'`.
  Grados: I (maj7), ii (min7), iii (min7), IV (maj7), V (dom7), vi (min7), vii° (m7b5).
- **armonizacionAmin** — tonalidad: `'A'`, modo: `'minor'`.
  Grados: i (min7), ii° (m7b5), III (maj7), iv (min7), v (min7), VI (maj7), VII (dom7).
- **modosC** — tonalidad: `'C'`, modo: `'major'`. Mismos grados que la
  armonización, con `bars: 2` cada uno.
- **circuloCuartasC** — tonalidad: `'C'`, modo: `'major'`.
  Grados: I (maj7), IV (maj7), vii° (m7b5), iii (min7), vi (min7), ii (min7), V (dom7).
- **circuloQuintasC** — tonalidad: `'C'`, modo: `'major'`.
  Grados: I (maj7), V (dom7), ii (min7), vi (min7), iii (min7), vii° (m7b5), IV (maj7).
- **iiVIDoceTonalidades** — caso especial (sección 2.5).
- **cromaticaUnaCuerda** — tonalidad: `'C'`, modo: `'major'`.
  Grados: I (maj7), bars: 8.

### 2.2 Improvisación — modal

- **modalDorian** — tonalidad: `'D'`, modo: `'minor'`.
  Grados: i (min7) ×2 bars, IV (dom7) ×2 bars. *Nota:* el IV en menor natural
  es mayor; aquí usamos `dom7` como cualidad. El modelo aún funciona porque la
  cualidad se respeta como dato; el grado solo da la raíz.
- **vampLidioC** — tonalidad: `'C'`, modo: `'major'`.
  Grados: I (maj7) ×2 bars, II (major) ×2 bars. (II no es diatónico en mayor
  natural; es préstamo del lidio o se interpreta como mayor sobre el 2º grado.
  Mayúscula porque la cualidad es mayor.)
- **frigioE** — tonalidad: `'E'`, modo: `'minor'`.
  Grados: i (minor) ×2, bII (major) ×2. *Nota:* en E menor natural el II es
  F#m, pero el frigio sustituye por F mayor (♭II) — por eso `bII`.
- **vampAmEm** — tonalidad: `'A'`, modo: `'minor'`.
  Grados: i (min7) ×2, v (min7) ×2.
- **soWhat** — tonalidad: `'D'`, modo: `'minor'`.
  Grados: i (min7) ×4, bii (min7) ×4. *Nota:* Eb desde D = +1 semitono = bii.

### 2.3 Improvisación — pop/rock/folk

- **popIviIVV** — tonalidad: `'C'`, modo: `'major'`.
  Grados: I (major), vi (minor), IV (major), V (major).
- **popModerno** — tonalidad: `'C'`, modo: `'major'`.
  Grados: vi (min7), IV (maj7), I (maj7), V (dom7).
- **popEpico** — tonalidad: `'C'`, modo: `'major'`.
  Grados: I (maj7), V (dom7), vi (min7), IV (maj7).
- **andaluzAm** — tonalidad: `'A'`, modo: `'minor'`.
  Grados: i (minor), VII (major), VI (major), VII (major).
- **andaluzaEm** — tonalidad: `'E'`, modo: `'minor'`.
  Grados: i (minor), VII (major), VI (major), V (dom7). *Nota:* el V dominante
  en menor (mayúscula con `dom7`) refleja la cadencia frigia / menor armónico.
- **metalEmin** — tonalidad: `'E'`, modo: `'minor'`.
  Grados: i (minor), VI (major), III (major), VII (major).

### 2.4 Improvisación — blues / jazz / lento

- **blues12A** — tonalidad: `'A'`, modo: `'major'`.
  Grados: I (dom7) ×4, IV (dom7) ×2, I (dom7) ×2, V (dom7) ×1, IV (dom7) ×1,
  I (dom7) ×1, V (dom7) ×1. *Nota:* los tres dominantes I7-IV7-V7 son el
  carácter del blues; aunque "I7" no sea estrictamente diatónico, lo dejamos
  como `I` con `quality: 'dom7'`. La cualidad manda en el sonido.
- **bluesLentoA** — tonalidad: `'A'`, modo: `'major'`. Mismos grados que
  blues12A con los bars del quick-change.
- **bluesMenorAm** — tonalidad: `'A'`, modo: `'minor'`.
  Grados: i (min7) ×4, iv (min7) ×2, i (min7) ×2, VI (maj7), V (dom7), i (min7),
  V (dom7).
- **jazzIIVI** — tonalidad: `'C'`, modo: `'major'`. Grados: ii (min7), V (dom7),
  I (maj7) ×2.
- **rhythmChanges** — tonalidad: `'C'`, modo: `'major'`. Grados: I (maj7),
  vi (min7), ii (min7), V (dom7).
- **autumnLeaves** — tonalidad: `'G'`, modo: `'major'` (G mayor, su relativa
  menor es Em — la progresión se mueve entre ambos centros).
  Grados: ii (min7), V (dom7), I (maj7), IV (maj7), #iv° (m7b5), VII (dom7),
  iii (min7) ×2. *Nota:* `#iv°` = F#m7b5 en G mayor (es el ii° del relativo
  menor Em). `VII (dom7)` = B7 (el V del relativo menor). `iii` = Em.
- **coltraneChanges** — tonalidad: `'C'`, modo: `'major'`.
  Grados: I (maj7), bIII (dom7), bVI (maj7), VII (dom7), III (maj7), V (dom7).
  *Nota:* `bIII` = Eb, `bVI` = Ab, `VII` = B (mayúscula porque la cualidad es
  dominante mayor), `III` = E.
- **baladaCmajAm** — tonalidad: `'C'`, modo: `'major'`.
  Grados: I (maj7) ×2, vi (min7) ×2.
- **vampLentoMenor** — tonalidad: `'A'`, modo: `'minor'`.
  Grados: i (min7) ×2, iv (min7) ×2.

### 2.5 Caso especial: `iiVIDoceTonalidades`

Esta progresión literalmente *recorre* las 12 tonalidades. No tiene una
"tonalidad nativa" útil para transponer — transponerla rota el ejercicio.
**Mantenerla con `root` fijo en el formato viejo**, marcándola con un campo
`transponible: false`. El motor debe respetarla tal cual. Tonalidad sugerida
de referencia: `'C'`. Esto crea un caso mixto en el catálogo, que es
correcto. Documentalo en un comentario.

### 2.6 Bailables

- **cumbiaAm** — tonalidad: `'A'`, modo: `'minor'`.
  Grados: i (minor) ×2, iv (minor), V (dom7).
- **salsaC** — tonalidad: `'C'`, modo: `'major'`.
  Grados: I (maj7), vi (min7), ii (min7), V (dom7).
- **bachataAm** — tonalidad: `'A'`, modo: `'minor'`.
  Grados: i (minor), VI (major), III (major), VII (major).
- **bossaIIVI** — tonalidad: `'C'`, modo: `'major'`.
  Grados: ii (min7), V (dom7), I (maj7), V/ii (dom7), ii (min7), V (dom7),
  I (maj7) ×2.
- **vallenatoAm** — tonalidad: `'A'`, modo: `'minor'`.
  Grados: i (minor) ×2, iv (minor), V (dom7), i (minor) ×2.
- **reggaeIV** — tonalidad: `'C'`, modo: `'major'`.
  Grados: I (maj7) ×2, IV (maj7) ×2.

### 2.7 Experimental

- **cromaticaMenor** — tonalidad: `'E'`, modo: `'minor'`.
  Grados: i (minor), bII (maj7), i (minor), vii (m7b5). *Nota:* `vii` desde E
  menor = D, pero queremos D# (un semitono arriba) — así que en realidad es
  `#vii (m7b5)` o `bi (m7b5)` (semitono debajo de la i, enarmónico). Usá
  `#vii` para mantener legibilidad ascendente.

---

## 3. Integración con el motor

Donde hoy el código llama a `factoryProgressions.chordsOf(id)` y recibe
`[{root, quality, bars}, ...]`, debe pasar a llamar a:

```js
BackingTrack.transpose.realizeProgression(prog, tonalidadActiva)
```

y recibir la misma forma. Auditá `app.js`, `engine.js` y donde se cargue una
progresión del catálogo; reemplazá las llamadas. **El motor no se entera de
los grados** — sigue trabajando con `root` concretos. Toda la lógica nueva
vive en `transpose.js` y en la nueva forma del catálogo.

Para progresiones marcadas con `transponible: false` (la de 12 tonalidades),
`realizeProgression` debe simplemente devolver los acordes tal cual (ya tienen
`root` definido en el archivo).

### 3.1 Cambio de tonalidad en vivo

Cuando el usuario cambia el selector mientras el Transport está sonando:

1. Recalcular los acordes con la tonalidad nueva.
2. **Cuantizar el cambio al próximo límite de compás** usando
   `Tone.Transport.scheduleOnce`. Reconstruir solo el scheduling de la
   progresión; las pistas y sus patrones quedan iguales.
3. Si hay varios cambios rápidos antes de llegar al límite, aplicar solo el
   último (coalescing), igual que para los cambios de patrón/preset.
4. La UI (chips de progresión, acorde actual, acorde siguiente) debe reflejar
   los nuevos nombres de acorde inmediatamente al cambiar el selector, aunque
   el audio entre en el próximo compás.

---

## 4. UI

### 4.1 Selector de tonalidad

Ubicación: **junto al desplegable "De fábrica"** en la sección Progresión de
la configuración. Formato: un `<select>` con las 12 tonalidades, etiquetado
"Tonalidad". Al lado, un botón pequeño "↻" con `title="Volver a la tonalidad
nativa"` que devuelve al `prog.tonalidad` original.

Tonalidades del selector (12, con la ortografía estándar):
`C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B`.

### 4.2 Comportamiento al cargar una progresión

Cuando el usuario elige una progresión en "De fábrica":

1. El selector de tonalidad se actualiza automáticamente a la `tonalidad`
   nativa de la progresión.
2. Los acordes se calculan con esa tonalidad y se cargan en la pista.

Para `iiVIDoceTonalidades` (no transponible), el selector se deshabilita
(disabled) mientras esa progresión esté cargada, con un tooltip que explique
por qué: "Esta progresión recorre las 12 tonalidades; no se transpone."

### 4.3 Persistencia en proyectos

El proyecto guarda la `tonalidadActiva` (la elegida por el usuario, no la
nativa). Al cargar el proyecto, se aplica esa tonalidad — si el usuario había
movido la armonización a F#, vuelve a F#.

---

## 5. Compatibilidad con proyectos antiguos

Los proyectos guardados antes de este cambio referencian progresiones por
`id` y, en muchos casos, copian el array de acordes (con `root` fijo) dentro
del proyecto. La lógica de carga de proyecto debe:

- Si el proyecto trae acordes con `root` definido (formato viejo), usarlos
  tal cual. No intentar transponerlos.
- Si el proyecto trae `tonalidadActiva` (formato nuevo), aplicarla al cargar
  la progresión del catálogo.
- Si el proyecto solo tiene `id` de progresión y nada más, cargar la
  progresión con su tonalidad nativa.

No borres datos. Los proyectos viejos deben abrirse sin error y sonar igual
que antes.

---

## 6. Restricciones

1. Sin build tooling ni dependencias nuevas.
2. Debe seguir funcionando con `file://`, sin internet.
3. ES5/IIFE, namespace global `BackingTrack.transpose`, igual que los demás
   módulos del backing track.
4. **Tests:** agregar `transpose.test.js` que verifique:
   - Armonización en C, G y Eb (raíces resultantes).
   - Un dominante secundario `V/ii` en C da A7 y en G da B7.
   - `bIII` en C mayor da Eb; `bII` en E menor da F.
   - `iiVIDoceTonalidades` con `transponible: false` devuelve los `root` del
     archivo sin transponer.
5. Después de migrar, **todas las progresiones cargan y suenan**. Probá en el
   navegador con cada una.

---

## 7. Orden de trabajo

1. Crear `transpose.js` con `realizeProgression` y el módulo de mapeo
   grado→semitono.
2. Crear `transpose.test.js` con los casos de la sección 6.4.
3. Migrar `progressions.js` al nuevo formato (sección 2). Mantener
   `iiVIDoceTonalidades` con `root` fijo y `transponible: false`.
4. Reemplazar en `app.js`/`engine.js` las llamadas que obtienen acordes de
   la progresión por `realizeProgression(prog, tonalidadActiva)`.
5. Agregar el selector de tonalidad + botón ↻ en la UI; cablearlos para
   cargar/cambiar/restaurar tonalidad.
6. Cambio en vivo: cuantizar al próximo compás (igual que cambios de patrón).
7. Persistencia: guardar/leer `tonalidadActiva` en proyectos; soporte para
   proyectos viejos.
8. Verificar las 34 progresiones en el navegador.

---

## 8. Criterios de aceptación

- [ ] `transpose.js` y `transpose.test.js` existen y los tests pasan.
- [ ] Las 33 progresiones transponibles están en formato grados; la
      `iiVIDoceTonalidades` queda con `root` fijo y `transponible: false`.
- [ ] Cargar una progresión adopta su tonalidad nativa automáticamente.
- [ ] El selector de tonalidad cambia los acordes en vivo, cuantizado al
      próximo compás, sin glitches.
- [ ] El botón "↻" vuelve a la tonalidad nativa de la progresión cargada.
- [ ] Los chips de acordes y el display "Acorde / Sigue" reflejan los acordes
      transpuestos.
- [ ] La ortografía de los acordes respeta la convención (bemoles en
      tonalidades de bemoles, sostenidos en las de sostenidos).
- [ ] Los proyectos guardados antes del cambio abren y suenan igual que antes.
- [ ] El proyecto nuevo guarda y restaura `tonalidadActiva`.
- [ ] Sigue funcionando con `file://`, sin dependencias nuevas.
