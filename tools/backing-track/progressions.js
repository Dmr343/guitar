// ─────────────────────────────────────────────────────────────
// Backing Track — progresiones de fábrica (solo datos)
//
// FORMATO NUEVO (transponibles):
//   {
//     id, nombre, categoria, genero, tempo,
//     tonalidad,   // tonalidad nativa: 'C', 'Eb', 'F#', ...
//     modo,        // 'major' | 'minor' — define la base del mapeo de grados
//     chords: [ { grado, quality, bars }, ... ],
//   }
//
// Cada acorde se escribe con grado romano respecto a la tonalidad nativa.
// El módulo `tools/backing-track/transpose.js` realiza los grados contra
// una tonalidad destino y entrega al motor la forma habitual {root, quality, bars}.
//
// Grados aceptados:
//   I, ii, iii, IV, V, vi, vii°           (diatónicos mayores)
//   i, ii°, III, iv, v, VI, VII           (diatónicos menores)
//   bII, bIII, bVI, bVII, #IV, #vii       (alteraciones cromáticas)
//   V/ii, V/iii, V/IV, V/V, V/vi          (dominantes secundarios)
//
// La cualidad fina (maj7, min7, dom7, m7b5, major, minor) va en `quality`
// — el grado solo define raíz y cualidad básica (mayúscula = mayor,
// minúscula = menor). Que `iii` se escriba con minúscula es solo una
// pista para el lector; el algoritmo respeta la cualidad explícita.
//
// FORMATO ESPECIAL (no transponible):
//   { ..., transponible: false, chords: [{root, quality, bars}, ...] }
// Para ejercicios que literalmente recorren las 12 tonalidades — transponerlos
// rompe el ejercicio. realizeProgression los pasa al motor sin tocar.
//
// Compatibilidad: tonalidad de progresiones con bemoles se escribe con
// bemoles (F, Bb, Eb, Ab); con sostenidos, sostenidos (G, D, A, E, B, F#).
// Las alteraciones cromáticas (bIII, #IV) fuerzan la grafía del prefijo —
// p. ej. bIII en C mayor se realiza como Eb, no D#.
//
// IIFE + namespace global. file:// safe.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const PROGRESSIONS = [

    // ═════════ ESTUDIO — localización de notas ═════════

    {
      id: 'armonizacionCmaj', nombre: 'Armonización de Do mayor',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I',    quality: 'maj7', bars: 1 },
        { grado: 'ii',   quality: 'min7', bars: 1 },
        { grado: 'iii',  quality: 'min7', bars: 1 },
        { grado: 'IV',   quality: 'maj7', bars: 1 },
        { grado: 'V',    quality: 'dom7', bars: 1 },
        { grado: 'vi',   quality: 'min7', bars: 1 },
        { grado: 'vii°', quality: 'm7b5', bars: 1 },
      ],
    },

    {
      id: 'armonizacionAmin', nombre: 'Armonización de La menor',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      tonalidad: 'A', modo: 'minor',
      chords: [
        { grado: 'i',   quality: 'min7', bars: 1 },
        { grado: 'ii°', quality: 'm7b5', bars: 1 },
        { grado: 'III', quality: 'maj7', bars: 1 },
        { grado: 'iv',  quality: 'min7', bars: 1 },
        { grado: 'v',   quality: 'min7', bars: 1 },
        { grado: 'VI',  quality: 'maj7', bars: 1 },
        { grado: 'VII', quality: 'dom7', bars: 1 },
      ],
    },

    {
      id: 'modosC', nombre: 'Modos de Do',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I',    quality: 'maj7', bars: 2 },   // jónico
        { grado: 'ii',   quality: 'min7', bars: 2 },   // dórico
        { grado: 'iii',  quality: 'min7', bars: 2 },   // frigio
        { grado: 'IV',   quality: 'maj7', bars: 2 },   // lidio
        { grado: 'V',    quality: 'dom7', bars: 2 },   // mixolidio
        { grado: 'vi',   quality: 'min7', bars: 2 },   // eólico
        { grado: 'vii°', quality: 'm7b5', bars: 2 },   // locrio
      ],
    },

    {
      id: 'circuloCuartasC', nombre: 'Círculo de cuartas en Do',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I',    quality: 'maj7', bars: 1 },
        { grado: 'IV',   quality: 'maj7', bars: 1 },
        { grado: 'vii°', quality: 'm7b5', bars: 1 },
        { grado: 'iii',  quality: 'min7', bars: 1 },
        { grado: 'vi',   quality: 'min7', bars: 1 },
        { grado: 'ii',   quality: 'min7', bars: 1 },
        { grado: 'V',    quality: 'dom7', bars: 1 },
      ],
    },

    {
      id: 'circuloQuintasC', nombre: 'Círculo de quintas en Do',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I',    quality: 'maj7', bars: 1 },
        { grado: 'V',    quality: 'dom7', bars: 1 },
        { grado: 'ii',   quality: 'min7', bars: 1 },
        { grado: 'vi',   quality: 'min7', bars: 1 },
        { grado: 'iii',  quality: 'min7', bars: 1 },
        { grado: 'vii°', quality: 'm7b5', bars: 1 },
        { grado: 'IV',   quality: 'maj7', bars: 1 },
      ],
    },

    // Esta progresión recorre las 12 tonalidades — transponerla
    // rompería el ejercicio. Marcada `transponible: false`, los root
    // fijos viajan al motor tal cual.
    {
      id: 'iiVIDoceTonalidades', nombre: 'ii–V–I en las 12 tonalidades',
      categoria: 'estudio', genero: 'estudio', tempo: 80,
      tonalidad: 'C', modo: 'major', transponible: false,
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
        { root: 'Bb', quality: 'maj7', bars: 1 },
        // Eb
        { root: 'F',  quality: 'min7', bars: 1 },
        { root: 'Bb', quality: 'dom7', bars: 1 },
        { root: 'Eb', quality: 'maj7', bars: 1 },
        // Ab
        { root: 'Bb', quality: 'min7', bars: 1 },
        { root: 'Eb', quality: 'dom7', bars: 1 },
        { root: 'Ab', quality: 'maj7', bars: 1 },
        // Db
        { root: 'Eb', quality: 'min7', bars: 1 },
        { root: 'Ab', quality: 'dom7', bars: 1 },
        { root: 'Db', quality: 'maj7', bars: 1 },
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

    // Cromática "una cuerda": I sostenido — para practicar localización
    // sobre una sola cuerda con un solo color armónico.
    {
      id: 'cromaticaUnaCuerda', nombre: 'Cromática — una cuerda (Do sostenido)',
      categoria: 'estudio', genero: 'estudio', tempo: 66,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I', quality: 'maj7', bars: 8 },
      ],
    },

    // ═════════ IMPROVISACIÓN — MODAL ═════════

    // Vamp dórico Dm — IV es dominante (carácter modo dórico).
    {
      id: 'modalDorian', nombre: 'Vamp dórico en Dm',
      categoria: 'improvisacion', genero: 'modal', tempo: 100,
      tonalidad: 'D', modo: 'minor',
      chords: [
        { grado: 'i',  quality: 'min7', bars: 2 },
        { grado: 'IV', quality: 'dom7', bars: 2 },
      ],
    },

    // Vamp lídio en C — el II (D major) es préstamo de la escala lídia.
    {
      id: 'vampLidioC', nombre: 'Vamp lídio en C',
      categoria: 'improvisacion', genero: 'modal', tempo: 88,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I',  quality: 'maj7',  bars: 2 },
        { grado: 'II', quality: 'major', bars: 2 },
      ],
    },

    // Frigio en E — bII es el color frigio (semitono arriba de la tónica).
    {
      id: 'frigioE', nombre: 'Frigio en E (Em – F)',
      categoria: 'improvisacion', genero: 'modal', tempo: 90,
      tonalidad: 'E', modo: 'minor',
      chords: [
        { grado: 'i',   quality: 'minor', bars: 2 },
        { grado: 'bII', quality: 'major', bars: 2 },
      ],
    },

    {
      id: 'vampAmEm', nombre: 'Vamp menor — Am7 / Em7',
      categoria: 'improvisacion', genero: 'modal', tempo: 90,
      tonalidad: 'A', modo: 'minor',
      chords: [
        { grado: 'i', quality: 'min7', bars: 2 },
        { grado: 'v', quality: 'min7', bars: 2 },
      ],
    },

    // So What — i ↔ bii menor (jazz modal, Kind of Blue).
    {
      id: 'soWhat', nombre: 'So What (Dm7 / E♭m7)',
      categoria: 'improvisacion', genero: 'modal', tempo: 130,
      tonalidad: 'D', modo: 'minor',
      chords: [
        { grado: 'i',   quality: 'min7', bars: 4 },
        { grado: 'bii', quality: 'min7', bars: 4 },
      ],
    },

    // ═════════ IMPROVISACIÓN — POP / ROCK ═════════

    {
      id: 'popIviIVV', nombre: 'Pop I–vi–IV–V en C',
      categoria: 'improvisacion', genero: 'pop', tempo: 100,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I',  quality: 'major', bars: 1 },
        { grado: 'vi', quality: 'minor', bars: 1 },
        { grado: 'IV', quality: 'major', bars: 1 },
        { grado: 'V',  quality: 'major', bars: 1 },
      ],
    },

    {
      id: 'popModerno', nombre: 'Pop vi–IV–I–V en C',
      categoria: 'improvisacion', genero: 'pop', tempo: 100,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'vi', quality: 'min7', bars: 1 },
        { grado: 'IV', quality: 'maj7', bars: 1 },
        { grado: 'I',  quality: 'maj7', bars: 1 },
        { grado: 'V',  quality: 'dom7', bars: 1 },
      ],
    },

    {
      id: 'popEpico', nombre: 'Pop I–V–vi–IV en C (épico)',
      categoria: 'improvisacion', genero: 'pop', tempo: 100,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I',  quality: 'maj7', bars: 1 },
        { grado: 'V',  quality: 'dom7', bars: 1 },
        { grado: 'vi', quality: 'min7', bars: 1 },
        { grado: 'IV', quality: 'maj7', bars: 1 },
      ],
    },

    // i–VII–VI–VII en menor — vamp oscuro modal.
    {
      id: 'andaluzAm', nombre: 'Rock i–♭VII–♭VI en Am',
      categoria: 'improvisacion', genero: 'rock', tempo: 95,
      tonalidad: 'A', modo: 'minor',
      chords: [
        { grado: 'i',   quality: 'minor', bars: 1 },
        { grado: 'VII', quality: 'major', bars: 1 },
        { grado: 'VI',  quality: 'major', bars: 1 },
        { grado: 'VII', quality: 'major', bars: 1 },
      ],
    },

    // Andaluza descendente — el V dominante (B7 en Em) da el color frigio.
    {
      id: 'andaluzaEm', nombre: 'Andaluza descendente en Em (Em – D – C – B7)',
      categoria: 'improvisacion', genero: 'rock', tempo: 100,
      tonalidad: 'E', modo: 'minor',
      chords: [
        { grado: 'i',   quality: 'minor', bars: 1 },
        { grado: 'VII', quality: 'major', bars: 1 },
        { grado: 'VI',  quality: 'major', bars: 1 },
        { grado: 'V',   quality: 'dom7',  bars: 1 },
      ],
    },

    {
      id: 'metalEmin', nombre: 'Metal en Em',
      categoria: 'improvisacion', genero: 'metal', tempo: 140,
      tonalidad: 'E', modo: 'minor',
      chords: [
        { grado: 'i',   quality: 'minor', bars: 1 },
        { grado: 'VI',  quality: 'major', bars: 1 },
        { grado: 'III', quality: 'major', bars: 1 },
        { grado: 'VII', quality: 'major', bars: 1 },
      ],
    },

    // ═════════ IMPROVISACIÓN — BLUES / JAZZ / LENTO ═════════

    // Blues mayor de 12 compases. I7-IV7-V7 — los tres dominantes son
    // el carácter del blues, aunque I7 no sea estrictamente diatónico:
    // la cualidad manda en el sonido.
    {
      id: 'blues12A', nombre: 'Blues de 12 compases en A',
      categoria: 'improvisacion', genero: 'blues', tempo: 90,
      tonalidad: 'A', modo: 'major',
      chords: [
        { grado: 'I',  quality: 'dom7', bars: 4 },
        { grado: 'IV', quality: 'dom7', bars: 2 },
        { grado: 'I',  quality: 'dom7', bars: 2 },
        { grado: 'V',  quality: 'dom7', bars: 1 },
        { grado: 'IV', quality: 'dom7', bars: 1 },
        { grado: 'I',  quality: 'dom7', bars: 1 },
        { grado: 'V',  quality: 'dom7', bars: 1 },
      ],
    },

    // Blues lento con "quick change" — el IV entra en el compás 2.
    {
      id: 'bluesLentoA', nombre: 'Blues lento en A',
      categoria: 'improvisacion', genero: 'blues', tempo: 56,
      tonalidad: 'A', modo: 'major',
      chords: [
        { grado: 'I',  quality: 'dom7', bars: 1 },
        { grado: 'IV', quality: 'dom7', bars: 1 },
        { grado: 'I',  quality: 'dom7', bars: 2 },
        { grado: 'IV', quality: 'dom7', bars: 2 },
        { grado: 'I',  quality: 'dom7', bars: 2 },
        { grado: 'V',  quality: 'dom7', bars: 1 },
        { grado: 'IV', quality: 'dom7', bars: 1 },
        { grado: 'I',  quality: 'dom7', bars: 1 },
        { grado: 'V',  quality: 'dom7', bars: 1 },
      ],
    },

    // Blues menor — VI maj7 → V7 al final, color jazz.
    {
      id: 'bluesMenorAm', nombre: 'Blues menor en Am (12 compases)',
      categoria: 'improvisacion', genero: 'blues', tempo: 80,
      tonalidad: 'A', modo: 'minor',
      chords: [
        { grado: 'i',  quality: 'min7', bars: 4 },
        { grado: 'iv', quality: 'min7', bars: 2 },
        { grado: 'i',  quality: 'min7', bars: 2 },
        { grado: 'VI', quality: 'maj7', bars: 1 },
        { grado: 'V',  quality: 'dom7', bars: 1 },
        { grado: 'i',  quality: 'min7', bars: 1 },
        { grado: 'V',  quality: 'dom7', bars: 1 },
      ],
    },

    {
      id: 'jazzIIVI', nombre: 'Jazz ii–V–I en C',
      categoria: 'improvisacion', genero: 'jazz', tempo: 120,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'ii', quality: 'min7', bars: 1 },
        { grado: 'V',  quality: 'dom7', bars: 1 },
        { grado: 'I',  quality: 'maj7', bars: 2 },
      ],
    },

    {
      id: 'rhythmChanges', nombre: 'Rhythm changes (sección A) en C',
      categoria: 'improvisacion', genero: 'jazz', tempo: 140,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I',  quality: 'maj7', bars: 1 },
        { grado: 'vi', quality: 'min7', bars: 1 },
        { grado: 'ii', quality: 'min7', bars: 1 },
        { grado: 'V',  quality: 'dom7', bars: 1 },
      ],
    },

    // Autumn Leaves — caso con grados tomados del relativo menor.
    // Why: vii° (F#m7b5 en G) es el ii° del relativo Em; V/vi (B7) es
    // el V del relativo (V de Em); vi (Em7) es el relativo en sí.
    // El prompt original ponía #iv°/VII/iii — eso producía C#°/F#/B
    // (otra progresión). Corregido tras auditoría con el usuario.
    {
      id: 'autumnLeaves', nombre: 'Autumn Leaves (núcleo)',
      categoria: 'improvisacion', genero: 'jazz', tempo: 100,
      tonalidad: 'G', modo: 'major',
      chords: [
        { grado: 'ii',   quality: 'min7', bars: 1 },
        { grado: 'V',    quality: 'dom7', bars: 1 },
        { grado: 'I',    quality: 'maj7', bars: 1 },
        { grado: 'IV',   quality: 'maj7', bars: 1 },
        { grado: 'vii°', quality: 'm7b5', bars: 1 },
        { grado: 'V/vi', quality: 'dom7', bars: 1 },
        { grado: 'vi',   quality: 'min7', bars: 2 },
      ],
    },

    // Coltrane changes simplificado — modulación por terceras mayores.
    // bIII y bVI se realizan con grafía con bemol (Eb, Ab) gracias a
    // que la alteración fuerza la ortografía aunque la tonalidad sea C.
    {
      id: 'coltraneChanges', nombre: 'Coltrane changes (simplificado)',
      categoria: 'improvisacion', genero: 'jazz', tempo: 100,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I',    quality: 'maj7', bars: 1 },
        { grado: 'bIII', quality: 'dom7', bars: 1 },
        { grado: 'bVI',  quality: 'maj7', bars: 1 },
        { grado: 'VII',  quality: 'dom7', bars: 1 },
        { grado: 'III',  quality: 'maj7', bars: 1 },
        { grado: 'V',    quality: 'dom7', bars: 1 },
      ],
    },

    {
      id: 'baladaCmajAm', nombre: 'Balada — vamp Cmaj7 / Am7',
      categoria: 'improvisacion', genero: 'balada', tempo: 64,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I',  quality: 'maj7', bars: 2 },
        { grado: 'vi', quality: 'min7', bars: 2 },
      ],
    },

    {
      id: 'vampLentoMenor', nombre: 'Vamp lento — Am7 / Dm7',
      categoria: 'improvisacion', genero: 'modal', tempo: 66,
      tonalidad: 'A', modo: 'minor',
      chords: [
        { grado: 'i',  quality: 'min7', bars: 2 },
        { grado: 'iv', quality: 'min7', bars: 2 },
      ],
    },

    // ═════════ BAILABLES ═════════

    {
      id: 'cumbiaAm', nombre: 'Cumbia en Am',
      categoria: 'bailable', genero: 'cumbia', tempo: 95,
      tonalidad: 'A', modo: 'minor',
      chords: [
        { grado: 'i',  quality: 'minor', bars: 2 },
        { grado: 'iv', quality: 'minor', bars: 1 },
        { grado: 'V',  quality: 'dom7',  bars: 1 },
      ],
    },

    {
      id: 'salsaC', nombre: 'Salsa — montuno I–vi–ii–V en C',
      categoria: 'bailable', genero: 'salsa', tempo: 100,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I',  quality: 'maj7', bars: 1 },
        { grado: 'vi', quality: 'min7', bars: 1 },
        { grado: 'ii', quality: 'min7', bars: 1 },
        { grado: 'V',  quality: 'dom7', bars: 1 },
      ],
    },

    {
      id: 'bachataAm', nombre: 'Bachata en Am',
      categoria: 'bailable', genero: 'bachata', tempo: 128,
      tonalidad: 'A', modo: 'minor',
      chords: [
        { grado: 'i',   quality: 'minor', bars: 1 },
        { grado: 'VI',  quality: 'major', bars: 1 },
        { grado: 'III', quality: 'major', bars: 1 },
        { grado: 'VII', quality: 'major', bars: 1 },
      ],
    },

    // Bossa ii–V–I con A7 secundario — V/ii tira hacia el Dm del próximo ciclo.
    {
      id: 'bossaIIVI', nombre: 'Bossa ii–V–I en C (con A7)',
      categoria: 'bailable', genero: 'bossa', tempo: 110,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'ii',   quality: 'min7', bars: 1 },
        { grado: 'V',    quality: 'dom7', bars: 1 },
        { grado: 'I',    quality: 'maj7', bars: 1 },
        { grado: 'V/ii', quality: 'dom7', bars: 1 },
        { grado: 'ii',   quality: 'min7', bars: 1 },
        { grado: 'V',    quality: 'dom7', bars: 1 },
        { grado: 'I',    quality: 'maj7', bars: 2 },
      ],
    },

    {
      id: 'vallenatoAm', nombre: 'Vallenato en Am',
      categoria: 'bailable', genero: 'vallenato', tempo: 85,
      tonalidad: 'A', modo: 'minor',
      chords: [
        { grado: 'i',  quality: 'minor', bars: 2 },
        { grado: 'iv', quality: 'minor', bars: 1 },
        { grado: 'V',  quality: 'dom7',  bars: 1 },
        { grado: 'i',  quality: 'minor', bars: 2 },
      ],
    },

    {
      id: 'reggaeIV', nombre: 'Reggae I–IV en C',
      categoria: 'bailable', genero: 'reggae', tempo: 80,
      tonalidad: 'C', modo: 'major',
      chords: [
        { grado: 'I',  quality: 'maj7', bars: 2 },
        { grado: 'IV', quality: 'maj7', bars: 2 },
      ],
    },

    // ═════════ EXPERIMENTAL ═════════

    // Cromática menor — i sube un semitono y vuelve, después baja un
    // semitono. #vii es el enarmónico ascendente del semitono debajo de
    // la i (D# en E menor).
    {
      id: 'cromaticaMenor', nombre: 'Cromática menor (cine noir)',
      categoria: 'experimental', genero: 'experimental', tempo: 80,
      tonalidad: 'E', modo: 'minor',
      chords: [
        { grado: 'i',    quality: 'minor', bars: 1 },
        { grado: 'bII',  quality: 'maj7',  bars: 1 },
        { grado: 'i',    quality: 'minor', bars: 1 },
        { grado: '#vii', quality: 'm7b5',  bars: 1 },
      ],
    },
  ];

  function byId(id) {
    return PROGRESSIONS.find(p => p.id === id) || null;
  }
  function byTipo(categoria) {
    return PROGRESSIONS.filter(p => p.categoria === categoria);
  }

  // chordsOf — compatibilidad hacia atrás: realiza la progresión en su
  // tonalidad nativa y devuelve [{root, quality, bars}, ...]. Si el motor
  // o tests viejos siguen llamando a chordsOf, no se rompen.
  function chordsOf(id) {
    const p = byId(id);
    if (!p) return [];
    const T = W.BackingTrack && W.BackingTrack.transpose;
    if (T && T.realizeProgression) return T.realizeProgression(p, p.tonalidad);
    // Fallback (transpose no cargado todavía): si la progresión ya tiene
    // root en los acordes, devolverlos tal cual.
    return p.chords.map(c => ({
      root: c.root || null, quality: c.quality, bars: c.bars,
    })).filter(c => c.root);
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.factoryProgressions = { PROGRESSIONS, byId, byTipo, chordsOf };
})(typeof window !== 'undefined' ? window : globalThis);
