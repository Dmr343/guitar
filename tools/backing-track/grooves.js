// ─────────────────────────────────────────────────────────────
// Backing Track — grooves de estilo (solo datos)
//
// Un groove es un "atajo de estilo": agrupa el patrón rítmico que le
// corresponde a cada tipo de pista (bajo, acordes, batería, percusión)
// más un tempo sugerido. Aplicar un groove pone de una vez el feel de
// blues, metal, modal, etc. en todas las pistas.
//
// Las claves de `patterns` son tipos de patrón (bass | chord | drums |
// perc); los valores son ids de patrones de patterns.js.
//
// Orden del arreglo (= orden del desplegable): agrupado por familia.
//
// IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const GROOVES = [

    // ─── Blues ───
    {
      id: 'bluesShuffle', nombre: 'Blues — shuffle', genero: 'blues', tempo: 92,
      patterns: { bass: 'bluesBass', chord: 'bluesComp',
                  drums: 'bluesShuffleDrums', perc: 'percBalada' },
    },
    {
      id: 'bluesLento', nombre: 'Blues — lento', genero: 'blues', tempo: 68,
      patterns: { bass: 'bajoNegras', chord: 'acordesBlancas',
                  drums: 'baladaSuave', perc: 'percBalada' },
    },
    {
      id: 'bluesBoogie', nombre: 'Blues — boogie', genero: 'blues', tempo: 130,
      patterns: { bass: 'bluesBass', chord: 'bluesComp',
                  drums: 'bluesBoogieDrums', perc: 'percBalada' },
    },

    // ─── Rock / Metal ───
    {
      id: 'rockGroove', nombre: 'Rock', genero: 'rock', tempo: 120,
      patterns: { bass: 'bajoOctavas', chord: 'acordesNegras',
                  drums: 'rockBasico' },
    },
    {
      id: 'rockHalfTime', nombre: 'Rock — medio tiempo', genero: 'rock', tempo: 84,
      patterns: { bass: 'bajoOctavas', chord: 'acordesBlancas',
                  drums: 'rockHalfTimeDrums' },
    },
    {
      id: 'metalMedio', nombre: 'Metal — medio tiempo', genero: 'metal', tempo: 124,
      patterns: { bass: 'bajoNegras', chord: 'acordesNegras',
                  drums: 'rockBasico' },
    },
    {
      id: 'metalGalope', nombre: 'Metal — galope', genero: 'metal', tempo: 160,
      patterns: { bass: 'metalGalopeBass', chord: 'metalChug',
                  drums: 'metalDoblePedal' },
    },

    // ─── Jazz / bossa ───
    {
      id: 'swingJazz', nombre: 'Swing jazz', genero: 'jazz', tempo: 132,
      patterns: { bass: 'bajoNegras', chord: 'acordesFreddie',
                  drums: 'swingJazzDrums' },
    },
    {
      id: 'bossaGroove', nombre: 'Bossa', genero: 'bossa', tempo: 122,
      patterns: { bass: 'bajoOctavas', chord: 'acordesSincopado',
                  drums: 'bossa', perc: 'percSamba' },
    },

    // ─── Funk / Pop / Modal ───
    {
      id: 'funkGroove', nombre: 'Funk', genero: 'funk', tempo: 104,
      patterns: { bass: 'bajoSincopado', chord: 'acordesSincopado',
                  drums: 'funkSeco', perc: 'percPop' },
    },
    {
      id: 'funkJamesBrown', nombre: 'Funk — James Brown', genero: 'funk', tempo: 96,
      patterns: { bass: 'bajoSincopado', chord: 'acordesSincopado',
                  drums: 'funkJamesBrownDrums', perc: 'percPop' },
    },
    {
      id: 'popGroove', nombre: 'Pop', genero: 'pop', tempo: 100,
      patterns: { bass: 'bajoNegras', chord: 'acordesNegras',
                  drums: 'popEstandar', perc: 'percPop' },
    },
    {
      id: 'modalVamp', nombre: 'Modal — vamp', genero: 'modal', tempo: 116,
      patterns: { bass: 'bajoRaiz', chord: 'acordesSostenido',
                  drums: 'modalGroove', perc: 'percLatina' },
    },

    // ─── Dance / urbano ───
    {
      id: 'disco', nombre: 'Disco', genero: 'disco', tempo: 120,
      patterns: { bass: 'bajoCorcheas', chord: 'acordesContratiempo',
                  drums: 'discoDrums' },
    },
    {
      id: 'trap', nombre: 'Trap', genero: 'urbano', tempo: 70,
      patterns: { bass: 'bajoRaiz', chord: 'acordesSostenido',
                  drums: 'trapDrums' },
    },

    // ─── Latinos ───
    // Para el sonido completo del género, además del groove conviene
    // elegir en la pista de percusión el preset latino correspondiente
    // (Percusión merengue / cumbia / salsa / bachata / cha-cha-chá).
    {
      id: 'merengue', nombre: 'Merengue', genero: 'latino', tempo: 132,
      patterns: { bass: 'bajoMerengue', chord: 'acordesContratiempo',
                  drums: 'merengueDrums', perc: 'percMerengue' },
    },
    {
      id: 'cumbia', nombre: 'Cumbia', genero: 'latino', tempo: 95,
      patterns: { bass: 'bajoCumbia', chord: 'acordesContratiempo',
                  drums: 'cumbiaDrums', perc: 'percCumbia' },
    },
    {
      id: 'salsa', nombre: 'Salsa', genero: 'latino', tempo: 100,
      patterns: { bass: 'bajoTumbao', chord: 'acordesMontuno',
                  drums: 'salsaCascara', perc: 'percSalsa' },
    },
    {
      id: 'chaChaCha', nombre: 'Cha-cha-chá', genero: 'latino', tempo: 110,
      patterns: { bass: 'bajoOctavas', chord: 'acordesContratiempo',
                  drums: 'salsaCascara', perc: 'percChaCha' },
    },
    {
      id: 'bachata', nombre: 'Bachata', genero: 'latino', tempo: 128,
      patterns: { bass: 'bajoBachata', chord: 'acordesCorcheas',
                  drums: 'bachataDrums', perc: 'percBachata' },
    },

    // ─── Otros ───
    // One drop clásico: bombo+caja en el 3, skank a contratiempo, bajo
    // sincopado con espacios.
    {
      id: 'reggaeRoots', nombre: 'Reggae — one drop', genero: 'reggae', tempo: 80,
      patterns: { bass: 'bajoReggae', chord: 'acordesContratiempo',
                  drums: 'reggaeOneDrop' },
    },
    {
      id: 'ska', nombre: 'Ska', genero: 'ska', tempo: 140,
      patterns: { bass: 'bajoNegras', chord: 'acordesContratiempo',
                  drums: 'skaDrums' },
    },
    {
      id: 'country', nombre: 'Country shuffle', genero: 'country', tempo: 96,
      patterns: { bass: 'bajoNegras', chord: 'acordesCorcheas',
                  drums: 'bluesShuffleDrums' },
    },
  ];

  function byId(id) {
    return GROOVES.find(g => g.id === id) || null;
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.factoryGrooves = { GROOVES, byId };
})(typeof window !== 'undefined' ? window : globalThis);
