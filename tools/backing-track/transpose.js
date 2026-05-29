// ─────────────────────────────────────────────────────────────
// Backing Track — transposición de progresiones por grados
//
// Recibe una progresión escrita con grados romanos
// ({ grado, quality, bars }) y una tonalidad destino, y devuelve
// la misma lista con raíces concretas ({ root, quality, bars }) —
// la forma que el motor ya consume.
//
// El módulo es de lógica pura: sin DOM, sin audio, sin estado.
// IIFE + namespace global (file:// safe).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  // ─── Tablas base por modo (semitonos del grado natural respecto a la tónica) ───
  // Mayor:  I=0, ii=2, iii=4, IV=5, V=7, vi=9, vii°=11
  // Menor:  i=0, ii°=2, III=3, iv=5, v=7, VI=8, VII=10
  //
  // Las claves están normalizadas a mayúsculas (I, II, III…). El parser
  // pasa el grado a mayúsculas antes de buscar — la diferencia de caso
  // en el grado original ('iii' vs 'III') es solo una pista para el
  // lector. La cualidad real va en el campo `quality` del acorde.
  const DEGREE_SEMITONE = {
    major: { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 },
    minor: { I: 0, II: 2, III: 3, IV: 5, V: 7, VI: 8, VII: 10 },
  };

  // ─── Ortografía de notas según la tonalidad destino ───
  // Tonalidades con bemoles → escribimos con bemoles (Eb, Ab, Bb, Db, Gb, Cb).
  // Resto → con sostenidos (incluyendo C como neutral por defecto).
  const SHARP_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FLAT_NOTES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const FLAT_TONICS = ['F','Bb','Eb','Ab','Db','Gb','Cb'];

  function preferFlats(tonalidad) {
    return FLAT_TONICS.indexOf(tonalidad) >= 0;
  }

  // spellNote: alteration ∈ {-1, 0, +1} es el prefijo cromático del grado.
  // 'b' (-1) fuerza grafía con bemol y '#' (+1) con sostenido, sin importar
  // la tonalidad — convención musical: un grado bemolado se escribe con
  // bemol (bIII en C → Eb, no D#) aunque la tonalidad de C no use bemoles.
  function spellNote(semitone, tonalidad, alteration) {
    const pc = ((semitone % 12) + 12) % 12;
    if (alteration === -1) return FLAT_NOTES[pc];
    if (alteration === 1)  return SHARP_NOTES[pc];
    return preferFlats(tonalidad) ? FLAT_NOTES[pc] : SHARP_NOTES[pc];
  }

  // Pitch class de la tónica (usa theory.pitchClass si está cargado, que
  // acepta ambas grafías; fallback a sharps).
  function tonicSemitone(name) {
    const th = W.GuitarShared && W.GuitarShared.theory;
    if (th && typeof th.pitchClass === 'function') return th.pitchClass(name);
    return SHARP_NOTES.indexOf(name);
  }

  // ─── Parser de grados ───
  //
  // Acepta:
  //   'I', 'ii', 'III'         — naturales (caso ignorado para semitono)
  //   'bIII', '#IV', 'bVII'    — alteraciones cromáticas
  //   'V/ii', 'V/vi'           — dominantes secundarios
  //   'vii°', 'ii°'            — el ° es decorativo (la cualidad va en `quality`)
  //
  // Devuelve { alteration: -1|0|1, base: 'I'…'VII', secondary: 'I'…'VII'|null }.
  function parseGrado(grado) {
    if (!grado || typeof grado !== 'string') return null;
    let s = grado.trim();
    if (!s) return null;

    let alteration = 0;
    if (s.charAt(0) === 'b') { alteration = -1; s = s.slice(1); }
    else if (s.charAt(0) === '#') { alteration = 1; s = s.slice(1); }

    let secondary = null;
    const slash = s.indexOf('/');
    if (slash >= 0) {
      secondary = s.slice(slash + 1).replace(/°/g, '').toUpperCase();
      s = s.slice(0, slash);
    }
    s = s.replace(/°/g, '').toUpperCase();
    if (!s) return null;
    return { alteration: alteration, base: s, secondary: secondary };
  }

  // Semitono del grado respecto a la tónica (no respecto a C absoluto).
  // Devuelve -1 si el grado no se puede interpretar en el modo dado.
  function gradoSemitone(grado, modo) {
    const p = parseGrado(grado);
    if (!p) return -1;
    const map = DEGREE_SEMITONE[modo] || DEGREE_SEMITONE.major;

    let base;
    if (p.secondary) {
      // V/X: el grado base es el de X, y se le suma 7 (la quinta de X).
      const xSemi = map[p.secondary];
      if (xSemi === undefined) return -1;
      base = (xSemi + 7) % 12;
    } else {
      const baseSemi = map[p.base];
      if (baseSemi === undefined) return -1;
      base = baseSemi;
    }
    return ((base + p.alteration) % 12 + 12) % 12;
  }

  // Realiza un acorde: grado → root concreto.
  // Si el acorde ya viene con `root` (caso de progresiones no transponibles),
  // se devuelve tal cual sin tocar nada.
  function realizeChord(chord, tonalidad, modo) {
    if (!chord) return null;
    if (chord.root) {
      return { root: chord.root, quality: chord.quality, bars: chord.bars };
    }
    const tonicSemi = tonicSemitone(tonalidad);
    if (tonicSemi < 0) return null;
    const gSemi = gradoSemitone(chord.grado, modo || 'major');
    if (gSemi < 0) return null;
    const parsed = parseGrado(chord.grado);
    const alt = parsed ? parsed.alteration : 0;
    return {
      root: spellNote(tonicSemi + gSemi, tonalidad, alt),
      quality: chord.quality,
      bars: chord.bars,
    };
  }

  // realizeProgression — punto de entrada del módulo.
  //   prog: { chords: [{grado|root, quality, bars}], tonalidad, modo, transponible? }
  //   tonalidad: 'C'|'Eb'|… (opcional; si no, usa prog.tonalidad).
  // Devuelve [{ root, quality, bars }, ...] — misma forma que hoy consume el motor.
  //
  // Si la progresión está marcada `transponible: false`, devuelve los acordes
  // con sus raíces fijas tal cual están en el archivo, ignorando la tonalidad
  // destino. Esto es necesario para ejercicios como "ii–V–I en las 12
  // tonalidades", que literalmente recorre las 12: transponerlo rompería el
  // ejercicio.
  function realizeProgression(prog, tonalidad) {
    if (!prog || !Array.isArray(prog.chords)) return [];
    if (prog.transponible === false) {
      return prog.chords.map(c => ({
        root: c.root, quality: c.quality, bars: c.bars,
      }));
    }
    const dest = tonalidad || prog.tonalidad || 'C';
    const modo = prog.modo || 'major';
    const out = [];
    for (let i = 0; i < prog.chords.length; i++) {
      const r = realizeChord(prog.chords[i], dest, modo);
      if (r) out.push(r);
    }
    return out;
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.transpose = {
    realizeProgression, realizeChord,
    gradoSemitone, parseGrado, spellNote,
    DEGREE_SEMITONE, FLAT_TONICS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
