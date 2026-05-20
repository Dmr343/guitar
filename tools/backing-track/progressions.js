// ─────────────────────────────────────────────────────────────
// Backing Track — progresiones de fábrica (solo datos)
//
// Cada progresión usa el mismo modelo de acorde que el Intervalic
// Atlas: { root, quality, bars }. Calidades válidas:
//   major, minor, dom7, maj7, min7, m7b5
//
// Campos:
//   id, nombre, categoria, genero, tempo, chords[]
//
// `categoria` agrupa el menú desplegable (optgroups):
//   'estudio'       — localizar notas / recorrer el mástil.
//   'improvisacion' — sonar bien en loop y ofrecer buenas rutas.
//   'bailable'      — grooves de baile (cumbia, salsa, bachata, etc.).
//   'experimental' — colores extraños y exigentes (cine noir, etc.).
//
// El orden de este arreglo es el orden dentro de cada grupo y, dentro
// de improvisación, está agrupado por subfamilia (modal, pop/rock,
// blues, jazz, lento).
//
// Nota: todas las raíces se escriben con sostenidos (el motor de
// teoría — tools/shared/theory.js — solo conoce el ciclo CHROMATIC
// con sharps). Suena idéntico al original con bemoles, pero en pantalla
// vas a ver D♯7 en lugar de E♭7 (Coltrane), F♯△ en lugar de G♭△, etc.
//
// IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const PROGRESSIONS = [

    // ═════════ ESTUDIO — localización de notas ═════════

    // Los 7 grados de Do mayor, los 4 tipos de acorde, solo notas
    // naturales. Caballito de batalla para localizar notas por cuerda.
    {
      id: 'armonizacionCmaj', nombre: 'Armonización de Do mayor',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      chords: [
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'E', quality: 'min7', bars: 1 },
        { root: 'F', quality: 'maj7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'B', quality: 'm7b5', bars: 1 },
      ],
    },

    // Mismas 7 notas naturales, centro tonal menor. Entrena a oír
    // el mismo material desde otro reposo.
    {
      id: 'armonizacionAmin', nombre: 'Armonización de La menor',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      chords: [
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'B', quality: 'm7b5', bars: 1 },
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'E', quality: 'min7', bars: 1 },
        { root: 'F', quality: 'maj7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ],
    },

    // Modos de Do: los mismos acordes que la armonización pero 2
    // compases cada uno — el doble de tiempo para escuchar el color
    // modal sobre cada centro.
    {
      id: 'modosC', nombre: 'Modos de Do',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      chords: [
        { root: 'C', quality: 'maj7', bars: 2 },  // jónico
        { root: 'D', quality: 'min7', bars: 2 },  // dórico
        { root: 'E', quality: 'min7', bars: 2 },  // frigio
        { root: 'F', quality: 'maj7', bars: 2 },  // lidio
        { root: 'G', quality: 'dom7', bars: 2 },  // mixolidio
        { root: 'A', quality: 'min7', bars: 2 },  // eólico
        { root: 'B', quality: 'm7b5', bars: 2 },  // locrio
      ],
    },

    // Los 7 acordes diatónicos en orden de cuartas ascendentes
    // (= quintas descendentes). Cada cambio "tira" hacia la resolución.
    {
      id: 'circuloCuartasC', nombre: 'Círculo de cuartas en Do',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      chords: [
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'F', quality: 'maj7', bars: 1 },
        { root: 'B', quality: 'm7b5', bars: 1 },
        { root: 'E', quality: 'min7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ],
    },

    // Los mismos 7 acordes en orden de quintas ascendentes — el
    // recorrido opuesto. Suena a tensión que se acumula, no a
    // resolución que tira: contraste útil con el círculo de cuartas.
    {
      id: 'circuloQuintasC', nombre: 'Círculo de quintas en Do',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      chords: [
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'E', quality: 'min7', bars: 1 },
        { root: 'B', quality: 'm7b5', bars: 1 },
        { root: 'F', quality: 'maj7', bars: 1 },
      ],
    },

    // ii–V–I en las 12 tonalidades, recorriendo el ciclo de cuartas
    // (con switch enarmónico Db → F#). 36 compases por ciclo — el
    // ejercicio canónico de jazz para que las manos y el oído conozcan
    // la célula central en todas las tonalidades.
    {
      id: 'iiVIDoceTonalidades', nombre: 'ii–V–I en las 12 tonalidades',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      chords: [
        // C
        { root: 'D',  quality: 'min7', bars: 1 },
        { root: 'G',  quality: 'dom7', bars: 1 },
        { root: 'C',  quality: 'maj7', bars: 1 },
        // F
        { root: 'G',  quality: 'min7', bars: 1 },
        { root: 'C',  quality: 'dom7', bars: 1 },
        { root: 'F',  quality: 'maj7', bars: 1 },
        // Bb
        { root: 'C',  quality: 'min7', bars: 1 },
        { root: 'F',  quality: 'dom7', bars: 1 },
        { root: 'A#', quality: 'maj7', bars: 1 },
        // Eb
        { root: 'F',  quality: 'min7', bars: 1 },
        { root: 'A#', quality: 'dom7', bars: 1 },
        { root: 'D#', quality: 'maj7', bars: 1 },
        // Ab
        { root: 'A#', quality: 'min7', bars: 1 },
        { root: 'D#', quality: 'dom7', bars: 1 },
        { root: 'G#', quality: 'maj7', bars: 1 },
        // Db
        { root: 'D#', quality: 'min7', bars: 1 },
        { root: 'G#', quality: 'dom7', bars: 1 },
        { root: 'C#', quality: 'maj7', bars: 1 },
        // F# (enarmónico de Gb)
        { root: 'G#', quality: 'min7', bars: 1 },
        { root: 'C#', quality: 'dom7', bars: 1 },
        { root: 'F#', quality: 'maj7', bars: 1 },
        // B
        { root: 'C#', quality: 'min7', bars: 1 },
        { root: 'F#', quality: 'dom7', bars: 1 },
        { root: 'B',  quality: 'maj7', bars: 1 },
        // E
        { root: 'F#', quality: 'min7', bars: 1 },
        { root: 'B',  quality: 'dom7', bars: 1 },
        { root: 'E',  quality: 'maj7', bars: 1 },
        // A
        { root: 'B',  quality: 'min7', bars: 1 },
        { root: 'E',  quality: 'dom7', bars: 1 },
        { root: 'A',  quality: 'maj7', bars: 1 },
        // D
        { root: 'E',  quality: 'min7', bars: 1 },
        { root: 'A',  quality: 'dom7', bars: 1 },
        { root: 'D',  quality: 'maj7', bars: 1 },
        // G
        { root: 'A',  quality: 'min7', bars: 1 },
        { root: 'D',  quality: 'dom7', bars: 1 },
        { root: 'G',  quality: 'maj7', bars: 1 },
      ],
    },

    // Un solo acorde sostenido: lienzo estable para recorrer una
    // cuerda entera de forma cromática, sin pensar en cambios.
    {
      id: 'cromaticaUnaCuerda', nombre: 'Cromática — una cuerda (Do sostenido)',
      categoria: 'estudio', genero: 'estudio', tempo: 66,
      chords: [
        { root: 'C', quality: 'maj7', bars: 8 },
      ],
    },

    // ═════════ IMPROVISACIÓN ═════════

    // ── Vamps modales (mínima fricción, ideales para empezar) ──

    // Vamp dórico de dos acordes.
    {
      id: 'modalDorian', nombre: 'Vamp dórico en Dm',
      categoria: 'improvisacion', genero: 'modal', tempo: 100,
      chords: [
        { root: 'D', quality: 'min7', bars: 2 },
        { root: 'G', quality: 'dom7', bars: 2 },
      ],
    },

    // Color lídio: la alternancia introduce el ♯4 (F♯).
    {
      id: 'vampLidioC', nombre: 'Vamp lídio en C',
      categoria: 'improvisacion', genero: 'modal', tempo: 88,
      chords: [
        { root: 'C', quality: 'maj7', bars: 2 },
        { root: 'D', quality: 'major', bars: 2 },
      ],
    },

    // Frigio puro: i → ♭II → i. El sonido "español oscuro" / metal.
    // Tonal center E; tocá E frigio (o frigio dominante con G♯) encima.
    {
      id: 'frigioE', nombre: 'Frigio en E (Em – F)',
      categoria: 'improvisacion', genero: 'modal', tempo: 90,
      chords: [
        { root: 'E', quality: 'minor', bars: 2 },
        { root: 'F', quality: 'major', bars: 2 },
      ],
    },

    // Vamp menor i–v: dos acordes menores balanceándose. Color frío
    // y melancólico, infinitamente loopeable.
    {
      id: 'vampAmEm', nombre: 'Vamp menor — Am7 / Em7',
      categoria: 'improvisacion', genero: 'modal', tempo: 90,
      chords: [
        { root: 'A', quality: 'min7', bars: 2 },
        { root: 'E', quality: 'min7', bars: 2 },
      ],
    },

    // So What: acorde menor sube un semitono y vuelve. Sonido del
    // jazz modal de los 60s (Kind of Blue). Dórico sobre cada acorde.
    {
      id: 'soWhat', nombre: 'So What (Dm7 / E♭m7)',
      categoria: 'improvisacion', genero: 'modal', tempo: 130,
      chords: [
        { root: 'D',  quality: 'min7', bars: 4 },
        { root: 'D#', quality: 'min7', bars: 4 },
      ],
    },

    // ── Pop / rock / folk (4 acordes diatónicos, cambios audibles) ──

    // Doo-wop / años 50: I–vi–IV–V.
    {
      id: 'popIviIVV', nombre: 'Pop I–vi–IV–V en C',
      categoria: 'improvisacion', genero: 'pop', tempo: 100,
      chords: [
        { root: 'C', quality: 'major', bars: 1 },
        { root: 'A', quality: 'minor', bars: 1 },
        { root: 'F', quality: 'major', bars: 1 },
        { root: 'G', quality: 'major', bars: 1 },
      ],
    },

    // Pop moderno vi–IV–I–V: el préstamo más usado del pop actual.
    // Centro ambiguo entre Am y C — muy improvisable, una sola
    // escala (Do mayor / La menor) cubre todo.
    {
      id: 'popModerno', nombre: 'Pop vi–IV–I–V en C',
      categoria: 'improvisacion', genero: 'pop', tempo: 100,
      chords: [
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'F', quality: 'maj7', bars: 1 },
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ],
    },

    // I–V–vi–IV: la "épica" — Let It Be, Don't Stop Believin'. Misma
    // familia que las otras dos pero arrancando en el I, suena elevado.
    {
      id: 'popEpico', nombre: 'Pop I–V–vi–IV en C (épico)',
      categoria: 'improvisacion', genero: 'pop', tempo: 100,
      chords: [
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'F', quality: 'maj7', bars: 1 },
      ],
    },

    // i–♭VII–♭VI en La menor: vamp oscuro modal (rock, psicodélico).
    {
      id: 'andaluzAm', nombre: 'Rock i–♭VII–♭VI en Am',
      categoria: 'improvisacion', genero: 'rock', tempo: 95,
      chords: [
        { root: 'A', quality: 'minor', bars: 1 },
        { root: 'G', quality: 'major', bars: 1 },
        { root: 'F', quality: 'major', bars: 1 },
        { root: 'G', quality: 'major', bars: 1 },
      ],
    },

    // Andaluza descendente en Em → B7: el sabor flamenco/español.
    // La resolución a B7 (V dominante) es lo que da el color frigio.
    {
      id: 'andaluzaEm', nombre: 'Andaluza descendente en Em (Em – D – C – B7)',
      categoria: 'improvisacion', genero: 'rock', tempo: 100,
      chords: [
        { root: 'E', quality: 'minor', bars: 1 },
        { root: 'D', quality: 'major', bars: 1 },
        { root: 'C', quality: 'major', bars: 1 },
        { root: 'B', quality: 'dom7', bars: 1 },
      ],
    },

    // i–VI–III–VII en Em: rock/metal, diatónico, cambios fuertes.
    {
      id: 'metalEmin', nombre: 'Metal en Em',
      categoria: 'improvisacion', genero: 'metal', tempo: 140,
      chords: [
        { root: 'E', quality: 'minor', bars: 1 },
        { root: 'C', quality: 'major', bars: 1 },
        { root: 'G', quality: 'major', bars: 1 },
        { root: 'D', quality: 'major', bars: 1 },
      ],
    },

    // ── Blues ──

    // Blues mayor clásico, 12 compases. Escuela de dominantes.
    {
      id: 'blues12A', nombre: 'Blues de 12 compases en A',
      categoria: 'improvisacion', genero: 'blues', tempo: 90,
      chords: [
        { root: 'A', quality: 'dom7', bars: 4 },
        { root: 'D', quality: 'dom7', bars: 2 },
        { root: 'A', quality: 'dom7', bars: 2 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'D', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
      ],
    },

    // Blues lento con "quick change" (IV en el compás 2). Espacio
    // para bends, vibrato y silencios expresivos.
    {
      id: 'bluesLentoA', nombre: 'Blues lento en A',
      categoria: 'improvisacion', genero: 'blues', tempo: 56,
      chords: [
        { root: 'A', quality: 'dom7', bars: 1 },
        { root: 'D', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 2 },
        { root: 'D', quality: 'dom7', bars: 2 },
        { root: 'A', quality: 'dom7', bars: 2 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'D', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
      ],
    },

    // Blues menor en Am, 12 compases con ♭VI–V7 al final (Fmaj7–E7).
    // Mucho más oscuro y jazzero que el blues mayor; cabe el dórico
    // y el menor armónico sobre el V7.
    {
      id: 'bluesMenorAm', nombre: 'Blues menor en Am (12 compases)',
      categoria: 'improvisacion', genero: 'blues', tempo: 80,
      chords: [
        { root: 'A', quality: 'min7', bars: 4 },
        { root: 'D', quality: 'min7', bars: 2 },
        { root: 'A', quality: 'min7', bars: 2 },
        { root: 'F', quality: 'maj7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
      ],
    },

    // ── Jazz ──

    // ii–V–I básico: la célula central del lenguaje tonal.
    {
      id: 'jazzIIVI', nombre: 'Jazz ii–V–I en C',
      categoria: 'improvisacion', genero: 'jazz', tempo: 120,
      chords: [
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'C', quality: 'maj7', bars: 2 },
      ],
    },

    // Rhythm changes — sección A (I–vi–ii–V cíclico). Después del
    // ii–V–I, la progresión más importante del jazz: estándar para
    // improvisar y para navegar cambios rápidos.
    {
      id: 'rhythmChanges', nombre: 'Rhythm changes (sección A) en C',
      categoria: 'improvisacion', genero: 'jazz', tempo: 140,
      chords: [
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ],
    },

    // Autumn Leaves (núcleo): ii–V–I en mayor seguido de ii–V–i en
    // menor. Conecta dos centros tonales relacionados (G mayor → Em).
    {
      id: 'autumnLeaves', nombre: 'Autumn Leaves (núcleo)',
      categoria: 'improvisacion', genero: 'jazz', tempo: 100,
      chords: [
        { root: 'A',  quality: 'min7',  bars: 1 },
        { root: 'D',  quality: 'dom7',  bars: 1 },
        { root: 'G',  quality: 'maj7',  bars: 1 },
        { root: 'C',  quality: 'maj7',  bars: 1 },
        { root: 'F#', quality: 'm7b5',  bars: 1 },
        { root: 'B',  quality: 'dom7',  bars: 1 },
        { root: 'E',  quality: 'min7',  bars: 2 },
      ],
    },

    // Coltrane changes simplificado: modulación por terceras mayores
    // (Giant Steps). Muy exigente — cada acorde te obliga a pensar
    // una tonalidad nueva.
    {
      id: 'coltraneChanges', nombre: 'Coltrane changes (simplificado)',
      categoria: 'improvisacion', genero: 'jazz', tempo: 100,
      chords: [
        { root: 'C',  quality: 'maj7', bars: 1 },
        { root: 'D#', quality: 'dom7', bars: 1 },
        { root: 'G#', quality: 'maj7', bars: 1 },
        { root: 'B',  quality: 'dom7', bars: 1 },
        { root: 'E',  quality: 'maj7', bars: 1 },
        { root: 'G',  quality: 'dom7', bars: 1 },
      ],
    },

    // ── Lento / lírico ──

    // I–vi con maj7/min7, lento y amplio. Sonido luminoso, mucho
    // aire para construir melodías.
    {
      id: 'baladaCmajAm', nombre: 'Balada — vamp Cmaj7 / Am7',
      categoria: 'improvisacion', genero: 'balada', tempo: 64,
      chords: [
        { root: 'C', quality: 'maj7', bars: 2 },
        { root: 'A', quality: 'min7', bars: 2 },
      ],
    },

    // i–iv menor, lento. Color oscuro; dórico o eólico encima.
    {
      id: 'vampLentoMenor', nombre: 'Vamp lento — Am7 / Dm7',
      categoria: 'improvisacion', genero: 'modal', tempo: 66,
      chords: [
        { root: 'A', quality: 'min7', bars: 2 },
        { root: 'D', quality: 'min7', bars: 2 },
      ],
    },

    // ═════════ BAILABLE ═════════

    // Cumbia: i–iv–V7 en La menor. Esqueleto simple y muy bailable.
    {
      id: 'cumbiaAm', nombre: 'Cumbia en Am',
      categoria: 'bailable', genero: 'cumbia', tempo: 95,
      chords: [
        { root: 'A', quality: 'minor', bars: 2 },
        { root: 'D', quality: 'minor', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
      ],
    },

    // Salsa: montuno I–vi–ii–V en Do. Ciclo con movimiento.
    {
      id: 'salsaC', nombre: 'Salsa — montuno I–vi–ii–V en C',
      categoria: 'bailable', genero: 'salsa', tempo: 100,
      chords: [
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'A', quality: 'min7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ],
    },

    // Bachata: i–VI–III–VII en La menor.
    {
      id: 'bachataAm', nombre: 'Bachata en Am',
      categoria: 'bailable', genero: 'bachata', tempo: 128,
      chords: [
        { root: 'A', quality: 'minor', bars: 1 },
        { root: 'F', quality: 'major', bars: 1 },
        { root: 'C', quality: 'major', bars: 1 },
        { root: 'G', quality: 'major', bars: 1 },
      ],
    },

    // Bossa ii–V–I en mayor con A7 — secundario dominante (V/ii) que
    // tira hacia el Dm del próximo ciclo. Lección de tensión-resolución
    // no diatónica. Pareala con el groove de bossa.
    {
      id: 'bossaIIVI', nombre: 'Bossa ii–V–I en C (con A7)',
      categoria: 'bailable', genero: 'bossa', tempo: 110,
      chords: [
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'A', quality: 'dom7', bars: 1 },
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'C', quality: 'maj7', bars: 2 },
      ],
    },

    // Vallenato: mismo esqueleto i–iv–V7 que la cumbia, pero más
    // lento y con más reposo sobre la tónica — la diferencia real con
    // la cumbia la da el groove (acordeón, caja, guacharaca).
    {
      id: 'vallenatoAm', nombre: 'Vallenato en Am',
      categoria: 'bailable', genero: 'vallenato', tempo: 85,
      chords: [
        { root: 'A', quality: 'minor', bars: 2 },
        { root: 'D', quality: 'minor', bars: 1 },
        { root: 'E', quality: 'dom7', bars: 1 },
        { root: 'A', quality: 'minor', bars: 2 },
      ],
    },

    // Reggae I–IV: el carácter del género viene del groove (one drop,
    // bajo sincopado, skank a contratiempo), no de la armonía. Pareala
    // con el groove de reggae para que suene.
    {
      id: 'reggaeIV', nombre: 'Reggae I–IV en C',
      categoria: 'bailable', genero: 'reggae', tempo: 80,
      chords: [
        { root: 'C', quality: 'maj7', bars: 2 },
        { root: 'F', quality: 'maj7', bars: 2 },
      ],
    },

    // ═════════ EXPERIMENTAL ═════════

    // Cromática menor: i sube un semitono y vuelve, después baja un
    // semitono. Movimientos por semitono = color de cine noir / espías
    // (Bond, Twin Peaks). Exigente para improvisar — cada acorde te
    // pide una escala distinta.
    {
      id: 'cromaticaMenor', nombre: 'Cromática menor (cine noir)',
      categoria: 'experimental', genero: 'experimental', tempo: 80,
      chords: [
        { root: 'E',  quality: 'minor', bars: 1 },
        { root: 'F',  quality: 'maj7',  bars: 1 },
        { root: 'E',  quality: 'minor', bars: 1 },
        { root: 'D#', quality: 'm7b5',  bars: 1 },
      ],
    },

  ];

  function byId(id) {
    return PROGRESSIONS.find(p => p.id === id) || null;
  }
  function byGenero(genero) {
    return PROGRESSIONS.filter(p => p.genero === genero);
  }
  function byCategoria(categoria) {
    return PROGRESSIONS.filter(p => p.categoria === categoria);
  }
  // Clon de la lista de acordes de una progresión.
  function chordsOf(id) {
    const p = byId(id);
    return p ? p.chords.map(c => ({ root: c.root, quality: c.quality, bars: c.bars })) : [];
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.factoryProgressions = { PROGRESSIONS, byId, byGenero, byCategoria, chordsOf };
})(typeof window !== 'undefined' ? window : globalThis);
