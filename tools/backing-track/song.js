// ─────────────────────────────────────────────────────────────
// Backing Track — estructura de canción (secciones)
//
// Módulo de lógica pura. Una canción es una lista ordenada de
// secciones (Intro / A / B / Puente…), cada una con su propia
// progresión, un número de repeticiones y una dinámica por pista
// (qué pistas suenan en esa sección — p. ej. la batería entra en B).
//
// Este módulo APLANA esa estructura a lo que el motor ya sabe tocar:
// una progresión lineal + rangos de steps donde cada pista va muteada.
// El scheduler no cambia; el motor filtra eventos por esos rangos.
//
// Sin audio, sin DOM. IIFE + namespace global (file:// safe).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const STEPS_PER_BAR = 16;   // 4/4, igual que el scheduler
  const MAX_REPEATS = 8;

  function clampBars(b) {
    b = Math.round(Number(b));
    if (!Number.isFinite(b) || b < 1) return 1;
    return Math.min(b, 8);
  }
  function clampRepeats(r) {
    r = Math.round(Number(r));
    if (!Number.isFinite(r) || r < 1) return 1;
    return Math.min(r, MAX_REPEATS);
  }

  // sanitizeSections — normaliza una lista de secciones de cualquier
  // procedencia (snapshot viejo, edición) al formato canónico:
  //   { id, name, repeats, chords: [{root,quality,bars}], mutes: {trackId:true} }
  // `mutes` guarda SOLO las pistas silenciadas (default: todas suenan).
  function sanitizeSections(sections) {
    if (!Array.isArray(sections)) return [];
    let auto = 0;
    return sections
      .filter(s => s && typeof s === 'object')
      .map((s, i) => {
        const chords = Array.isArray(s.chords)
          ? s.chords
              .filter(c => c && c.root)
              .map(c => ({ root: c.root, quality: c.quality, bars: clampBars(c.bars) }))
          : [];
        const mutes = {};
        if (s.mutes && typeof s.mutes === 'object') {
          Object.keys(s.mutes).forEach(k => { if (s.mutes[k] === true) mutes[k] = true; });
        }
        return {
          id: (typeof s.id === 'string' && s.id) ? s.id : 'sec-auto-' + (++auto) + '-' + i,
          name: (typeof s.name === 'string' && s.name.trim()) ? s.name.trim() : ('S' + (i + 1)),
          repeats: clampRepeats(s.repeats),
          chords: chords,
          mutes: mutes,
        };
      });
  }

  // flatten — secciones → progresión lineal para el scheduler.
  // Devuelve:
  //   chords       [{root,quality,bars}] concatenados (repeticiones incluidas)
  //   chordMap     por índice aplanado: { sectionIdx, chordIdx, repeat }
  //   sectionSpans por pasada de sección: { sectionIdx, repeat, startBar, bars }
  // Las secciones sin acordes no aportan nada (ni compases ni spans).
  function flatten(sections) {
    const secs = Array.isArray(sections) ? sections : [];
    const chords = [], chordMap = [], sectionSpans = [];
    let barCursor = 0;
    secs.forEach((sec, sIdx) => {
      if (!sec || !Array.isArray(sec.chords) || !sec.chords.length) return;
      const secBars = sec.chords.reduce((n, c) => n + clampBars(c.bars), 0);
      const reps = clampRepeats(sec.repeats);
      for (let r = 0; r < reps; r++) {
        sectionSpans.push({ sectionIdx: sIdx, repeat: r, startBar: barCursor, bars: secBars });
        sec.chords.forEach((c, cIdx) => {
          chords.push({ root: c.root, quality: c.quality, bars: clampBars(c.bars) });
          chordMap.push({ sectionIdx: sIdx, chordIdx: cIdx, repeat: r });
        });
        barCursor += secBars;
      }
    });
    return { chords: chords, chordMap: chordMap, sectionSpans: sectionSpans };
  }

  // muteSpans — rangos de steps donde cada pista está silenciada.
  // Devuelve { trackId: [{ startStep, endStep }] } (endStep exclusivo).
  // Los spans contiguos de la misma pista no se fusionan — no hace
  // falta: el chequeo del motor es por pertenencia.
  function muteSpans(sections, sectionSpans) {
    const out = {};
    (sectionSpans || []).forEach(span => {
      const sec = sections[span.sectionIdx];
      const mutes = (sec && sec.mutes) || {};
      Object.keys(mutes).forEach(trackId => {
        if (mutes[trackId] !== true) return;
        (out[trackId] = out[trackId] || []).push({
          startStep: span.startBar * STEPS_PER_BAR,
          endStep: (span.startBar + span.bars) * STEPS_PER_BAR,
        });
      });
    });
    return out;
  }

  // isMutedAt — ¿la pista está silenciada en este step?
  function isMutedAt(muteByTrack, trackId, step) {
    const spans = muteByTrack && muteByTrack[trackId];
    if (!spans) return false;
    return spans.some(sp => step >= sp.startStep && step < sp.endStep);
  }

  // flattenedIndexOf — índice aplanado del acorde `chordIdx` de la
  // sección `sectionIdx` en su PRIMERA pasada (repeat 0). -1 si no está.
  function flattenedIndexOf(chordMap, sectionIdx, chordIdx) {
    for (let i = 0; i < (chordMap || []).length; i++) {
      const m = chordMap[i];
      if (m.sectionIdx === sectionIdx && m.chordIdx === chordIdx && m.repeat === 0) return i;
    }
    return -1;
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.song = {
    sanitizeSections, flatten, muteSpans, isMutedAt, flattenedIndexOf,
    STEPS_PER_BAR, MAX_REPEATS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
