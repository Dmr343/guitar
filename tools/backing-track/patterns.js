// ─────────────────────────────────────────────────────────────
// Backing Track — librería de patrones de fábrica (solo datos)
//
// Cada patrón es una grilla de pasos (16 pasos/compás, 4/4) con la
// forma { steps, lanes, hits:[{lane,step,velocity}] }, idéntica a la
// que produce step-grid.js. El campo `tipo` indica para qué clase de
// pista sirve el patrón (bass | chord | drums | perc).
//
// Orden del arreglo (= orden de los desplegables): agrupado por tipo
// y, dentro de cada tipo, organizado en secciones:
//   1. Figuras clásicas (redonda, blanca, negra, corchea, semicorchea).
//   2. Patrones característicos (sincopado, sostenido, contratiempo).
//   3. Patrones de estilo (cada estilo tiene su patrón rítmico).
//
// Sin lógica de motor, sin audio. IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const KIT_LANES = ['kick', 'snare', 'hat', 'cymbal'];
  const PERC_LANES = ['bongo_hi', 'bongo_lo', 'conga', 'shaker'];

  // Helpers de construcción (solo arman datos).
  function mono(steps, vel) {
    return steps.map(s => ({ lane: 'main', step: s, velocity: vel == null ? 0.85 : vel }));
  }
  function lane(name, steps, vel) {
    return steps.map(s => ({ lane: name, step: s, velocity: vel == null ? 0.8 : vel }));
  }

  const PATTERNS = [

    // ═══════════════════ BAJO ═══════════════════

    // ── Figuras clásicas ──
    // (la nota concreta que se toca — fundamental, quinta, octava — la
    // decide el motor de voicings; el patrón solo define el ritmo.)
    { id: 'bajoRaiz', nombre: 'Redonda', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0], 0.9) },
    { id: 'bajoOctavas', nombre: 'Blanca', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0, 8], 0.88) },
    { id: 'bajoNegras', nombre: 'Negras', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0, 4, 8, 12], 0.85) },
    { id: 'bajoCorcheas', nombre: 'Corcheas', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0,2,4,6,8,10,12,14], 0.8) },
    { id: 'bajoSemicorcheas', nombre: 'Semicorcheas', tipo: 'bass',
      steps: 16, lanes: ['main'],
      hits: mono([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], 0.72) },

    // ── Característicos ──
    { id: 'bajoSincopado', nombre: 'Sincopado', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0, 6, 8, 14], 0.82) },

    // ── Por estilo ──
    { id: 'bluesBass', nombre: 'Blues', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0, 3, 8, 11], 0.85) },
    { id: 'metalGalopeBass', nombre: 'Metal — galope', tipo: 'bass',
      steps: 16, lanes: ['main'],
      hits: mono([0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], 0.85) },
    // Merengue: bajo activo con empujes ("a" de cada pulso).
    { id: 'bajoMerengue', nombre: 'Merengue', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0, 3, 6, 8, 11, 14], 0.85) },
    // Cumbia: balanceo sobre el "y" de 2 y el "y" de 4.
    { id: 'bajoCumbia', nombre: 'Cumbia', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0, 6, 8, 11, 14], 0.84) },
    // Tumbao de salsa: bajo anticipado — NO toca en el pulso 1.
    { id: 'bajoTumbao', nombre: 'Tumbao (salsa)', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([6, 12, 14], 0.86) },
    // Bachata: pulso con pickups en la "a".
    { id: 'bajoBachata', nombre: 'Bachata', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0, 3, 8, 11], 0.84) },
    // Reggae: sincopado y melódico, con espacio.
    { id: 'bajoReggae', nombre: 'Reggae', tipo: 'bass',
      steps: 16, lanes: ['main'], hits: mono([0, 6, 8, 11], 0.84) },

    // ═══════════════════ ACORDES ═══════════════════

    // ── Figuras clásicas ──
    { id: 'acordesRedonda', nombre: 'Redonda', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([0], 0.65) },
    { id: 'acordesBlancas', nombre: 'Blancas', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([0, 8], 0.7) },
    { id: 'acordesNegras', nombre: 'Negras', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([0, 4, 8, 12], 0.65) },
    { id: 'acordesCorcheas', nombre: 'Corcheas', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([0,2,4,6,8,10,12,14], 0.6) },
    { id: 'acordesSemicorcheas', nombre: 'Semicorcheas', tipo: 'chord',
      steps: 16, lanes: ['main'],
      hits: mono([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], 0.5) },

    // ── Característicos ──
    // Sostenido: un solo ataque, deja sonar el acorde el compás entero.
    { id: 'acordesSostenido', nombre: 'Sostenido', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([0], 0.6) },
    { id: 'acordesSincopado', nombre: 'Sincopado', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([0, 3, 8, 11], 0.68) },
    // Contratiempo: stabs en el "y" de cada pulso. El "skank" del
    // reggae/ska, y la guitarra/acordeón de cumbia y merengue.
    { id: 'acordesContratiempo', nombre: 'Contratiempo', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([2, 6, 10, 14], 0.66) },
    // Freddie Green: comping de jazz en 2 y 4 (golpe en cada backbeat).
    { id: 'acordesFreddie', nombre: 'Comping en 2 y 4', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([4, 12], 0.65) },

    // ── Por estilo ──
    { id: 'bluesComp', nombre: 'Blues', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([0, 6, 8, 14], 0.6) },
    { id: 'metalChug', nombre: 'Metal — chug', tipo: 'chord',
      steps: 16, lanes: ['main'],
      hits: mono([0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], 0.7) },
    { id: 'acordesMontuno', nombre: 'Montuno (salsa)', tipo: 'chord',
      steps: 16, lanes: ['main'], hits: mono([0, 3, 6, 8, 11, 14], 0.62) },

    // ═══════════════════ BATERÍA ═══════════════════

    // ── Básicos ──
    { id: 'rockBasico', nombre: 'Rock básico', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 8], 0.95),
        lane('snare', [4, 12], 0.85),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.55)) },
    { id: 'baladaSuave', nombre: 'Balada suave', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0], 0.8),
        lane('snare', [8], 0.6),
        lane('hat',   [0, 4, 8, 12], 0.45)) },
    { id: 'popEstandar', nombre: 'Pop estándar', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 8, 10], 0.9),
        lane('snare', [4, 12], 0.8),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.55)) },
    { id: 'hipHop', nombre: 'Hip-hop', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 6, 10], 0.9),
        lane('snare', [4, 12], 0.85),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.5)) },

    // ── Blues ──
    // Shuffle: feel ternario aproximado en grilla de 16 (cada pulso =
    // paso 0 y 3, "largo-corto").
    { id: 'bluesShuffleDrums', nombre: 'Blues — shuffle', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 8], 0.9),
        lane('snare', [4, 12], 0.82),
        lane('hat',   [0, 3, 4, 7, 8, 11, 12, 15], 0.5)) },
    // Boogie: bombo activo en los 4 pulsos + shuffle en el hi-hat.
    { id: 'bluesBoogieDrums', nombre: 'Blues — boogie', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 4, 8, 12], 0.9),
        lane('snare', [4, 12], 0.82),
        lane('hat',   [0, 3, 4, 7, 8, 11, 12, 15], 0.5)) },

    // ── Rock / Metal ──
    // Half-time: caja SÓLO en el pulso 3 (en vez de 2 y 4). Da el feel
    // arrastrado, más pesado.
    { id: 'rockHalfTimeDrums', nombre: 'Rock — medio tiempo', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 10], 0.92),
        lane('snare', [8], 0.85),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.55)) },
    { id: 'metalDoblePedal', nombre: 'Metal — doble pedal', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',   [0, 2, 4, 6, 8, 10, 12, 14], 0.95),
        lane('snare',  [4, 12], 0.9),
        lane('cymbal', [0, 8], 0.8)) },

    // ── Funk ──
    { id: 'funkSeco', nombre: 'Funk seco', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 3, 10], 0.9),
        lane('snare', [4, 12], 0.85),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.5)) },
    // James Brown: ghost notes en la caja (golpes muy bajos en los
    // contratiempos) que rellenan el groove con humo.
    { id: 'funkJamesBrownDrums', nombre: 'Funk — James Brown', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 4, 10], 0.92),
        lane('snare', [4, 12], 0.85),
        lane('snare', [2, 6, 14], 0.32),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.5)) },

    // ── Jazz / bossa / modal ──
    // Swing: ride spang-a-lang en cymbal, hi-hat cerrado en 2 y 4,
    // bombo "feathered" (muy suave) en los 4 pulsos.
    { id: 'swingJazzDrums', nombre: 'Swing jazz', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',   [0, 4, 8, 12], 0.4),
        lane('hat',    [4, 12], 0.55),
        lane('cymbal', [0, 4, 6, 8, 12, 14], 0.62)) },
    { id: 'bossa', nombre: 'Bossa', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 6, 8, 14], 0.8),
        lane('snare', [3, 7, 10, 13], 0.5),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.5)) },
    { id: 'modalGroove', nombre: 'Modal abierto', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 6, 10], 0.82),
        lane('snare', [4, 12], 0.7),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.45)) },

    // ── Dance / urbano ──
    // Disco: four-on-the-floor (bombo en los 4 pulsos), hi-hat
    // "abierto" en los contratiempos (acá: misma lane, velocity más
    // alta para sugerir la apertura).
    { id: 'discoDrums', nombre: 'Disco', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 4, 8, 12], 0.95),
        lane('snare', [4, 12], 0.78),
        lane('hat',   [0, 4, 8, 12], 0.45),
        lane('hat',   [2, 6, 10, 14], 0.72)) },
    // Ska: bombo en todos los pulsos (acelera la sensación rock).
    { id: 'skaDrums', nombre: 'Ska', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 4, 8, 12], 0.9),
        lane('snare', [4, 12], 0.82),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.5)) },
    // Trap: hi-hats con rolls al final del compás (en grilla de 16,
    // aproximación a los tresillos del trap moderno).
    { id: 'trapDrums', nombre: 'Trap', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 7, 10], 0.95),
        lane('snare', [4, 12], 0.85),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 13, 14, 15], 0.5)) },

    // ── Latinos ──
    { id: 'merengueDrums', nombre: 'Merengue', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 4, 8, 12], 0.9),
        lane('snare', [3, 4, 11, 12], 0.78),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.5)) },
    { id: 'cumbiaDrums', nombre: 'Cumbia', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 8], 0.88),
        lane('snare', [4, 12], 0.8),
        lane('hat',   [2, 6, 10, 14], 0.5)) },
    // Cáscara: el patrón de timbales de la salsa, sobre el hi-hat.
    { id: 'salsaCascara', nombre: 'Cáscara (salsa)', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 8], 0.82),
        lane('snare', [4, 12], 0.7),
        lane('hat',   [0, 2, 3, 6, 8, 10, 11, 14], 0.55)) },
    { id: 'bachataDrums', nombre: 'Bachata', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [0, 8], 0.84),
        lane('snare', [4, 12], 0.74),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.48)) },

    // ── Reggae ──
    // One drop: la marca del reggae roots es que NO hay bombo en el
    // pulso 1. Bombo + caja golpean juntos en el pulso 3.
    { id: 'reggaeOneDrop', nombre: 'Reggae — one drop', tipo: 'drums',
      steps: 16, lanes: KIT_LANES, hits: [].concat(
        lane('kick',  [8], 0.92),
        lane('snare', [8], 0.85),
        lane('hat',   [0, 2, 4, 6, 8, 10, 12, 14], 0.5)) },

    // ═══════════════════ PERCUSIÓN ═══════════════════

    // ── Genéricos ──
    { id: 'percBalada', nombre: 'Balada', tipo: 'perc',
      steps: 16, lanes: PERC_LANES, hits: [].concat(
        lane('conga',  [0, 8], 0.55),
        lane('shaker', [4, 12], 0.4)) },
    { id: 'percPop', nombre: 'Pop suave', tipo: 'perc',
      steps: 16, lanes: PERC_LANES, hits: [].concat(
        lane('shaker', [0, 2, 4, 6, 8, 10, 12, 14], 0.45),
        lane('conga',  [4, 12], 0.6)) },

    // ── Por estilo ──
    { id: 'percLatina', nombre: 'Latina', tipo: 'perc',
      steps: 16, lanes: PERC_LANES, hits: [].concat(
        lane('conga',    [0, 3, 6, 8, 11, 14], 0.7),
        lane('bongo_hi', [2, 10], 0.6),
        lane('shaker',   [0, 2, 4, 6, 8, 10, 12, 14], 0.4)) },
    { id: 'percAfro', nombre: 'Afro', tipo: 'perc',
      steps: 16, lanes: PERC_LANES, hits: [].concat(
        lane('conga',    [0, 2, 5, 7, 10, 12, 15], 0.7),
        lane('bongo_lo', [3, 11], 0.65),
        lane('bongo_hi', [6, 14], 0.6),
        lane('shaker',   [1, 3, 5, 7, 9, 11, 13, 15], 0.4)) },
    { id: 'percSamba', nombre: 'Samba', tipo: 'perc',
      steps: 16, lanes: PERC_LANES, hits: [].concat(
        lane('conga',    [0, 3, 4, 7, 8, 11, 12, 15], 0.7),
        lane('bongo_hi', [2, 6, 10, 14], 0.55),
        lane('shaker',   [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], 0.35)) },
    // Merengue: güira (down-up-up) + tambora.
    { id: 'percMerengue', nombre: 'Merengue (güira + tambora)', tipo: 'perc',
      steps: 16, lanes: PERC_LANES, hits: [].concat(
        lane('shaker',   [0,2,3,4,6,7,8,10,11,12,14,15], 0.45),
        lane('conga',    [0, 4, 8, 12], 0.7),
        lane('bongo_lo', [3, 6, 11, 14], 0.6),
        lane('bongo_hi', [2, 10], 0.55)) },
    // Cumbia: guacharaca (corcheas) + llamador a contratiempo.
    { id: 'percCumbia', nombre: 'Cumbia (guacharaca)', tipo: 'perc',
      steps: 16, lanes: PERC_LANES, hits: [].concat(
        lane('shaker',   [0, 2, 4, 6, 8, 10, 12, 14], 0.45),
        lane('conga',    [2, 6, 10, 14], 0.68),
        lane('bongo_hi', [4, 12], 0.55)) },
    // Salsa: conga tumbao + bongó martillo + clave son (3-2) + güiro.
    { id: 'percSalsa', nombre: 'Salsa (congas + clave)', tipo: 'perc',
      steps: 16, lanes: PERC_LANES, hits: [].concat(
        lane('conga',    [3, 6, 7, 11, 14, 15], 0.7),
        lane('bongo_hi', [0, 2, 4, 6, 8, 10, 12, 14], 0.5),
        lane('bongo_lo', [0, 3, 6, 10, 12], 0.62),
        lane('shaker',   [0, 2, 4, 6, 8, 10, 12, 14], 0.38)) },
    // Bachata: güira + bongó (con la "a" final).
    { id: 'percBachata', nombre: 'Bachata (güira + bongó)', tipo: 'perc',
      steps: 16, lanes: PERC_LANES, hits: [].concat(
        lane('shaker',   [0, 2, 4, 6, 8, 10, 12, 14, 15], 0.45),
        lane('bongo_hi', [0, 4, 8, 12], 0.6),
        lane('bongo_lo', [2, 6, 10, 14], 0.5),
        lane('conga',    [0, 8], 0.5)) },
    // Cha-cha-chá: maracas en corcheas + tumbao + el "cha-cha-cha"
    // sobre el cambio de compás (pasos 12, 14, 0 del próximo loop).
    { id: 'percChaCha', nombre: 'Cha-cha-chá', tipo: 'perc',
      steps: 16, lanes: PERC_LANES, hits: [].concat(
        lane('shaker',   [0, 2, 4, 6, 8, 10, 12, 14], 0.45),
        lane('conga',    [6, 7, 14, 15], 0.7),
        lane('bongo_hi', [4, 12], 0.55),
        lane('bongo_lo', [0, 12, 14], 0.62)) },
  ];

  function byId(id) {
    return PATTERNS.find(p => p.id === id) || null;
  }
  function byTipo(tipo) {
    return PATTERNS.filter(p => p.tipo === tipo);
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.factoryPatterns = { PATTERNS, byId, byTipo, KIT_LANES, PERC_LANES };
})(typeof window !== 'undefined' ? window : globalThis);
