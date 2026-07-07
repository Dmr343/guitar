// Tests para song (secciones) — IIFE, sin DOM ni audio.
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const S = W.BackingTrack && W.BackingTrack.song;
  if (!S) { console.error('BackingTrack.song not loaded'); return; }

  function twoSections() {
    return [
      { id: 'a', name: 'A', repeats: 2, mutes: { t2: true },
        chords: [
          { root: 'C', quality: 'maj7', bars: 1 },
          { root: 'F', quality: 'dom7', bars: 1 },
        ] },
      { id: 'b', name: 'B', repeats: 1, mutes: {},
        chords: [{ root: 'G', quality: 'dom7', bars: 2 }] },
    ];
  }

  T.describe('song.sanitizeSections', () => {
    T.it('normaliza nombres, repeats y bars', () => {
      const out = S.sanitizeSections([
        { name: '  Intro ', repeats: 99, chords: [{ root: 'C', quality: 'maj7', bars: 99 }] },
        { chords: [] },
      ]);
      T.assertEq(out[0].name, 'Intro');
      T.assertEq(out[0].repeats, 8);
      T.assertEq(out[0].chords[0].bars, 8);
      T.assertEq(out[1].name, 'S2');
      T.assertEq(out[1].repeats, 1);
    });
    T.it('acordes sin root se descartan; mutes solo con true', () => {
      const out = S.sanitizeSections([{
        chords: [{ root: 'C', quality: 'maj7', bars: 1 }, { quality: 'x' }],
        mutes: { t1: true, t2: false, t3: 'si' },
      }]);
      T.assertEq(out[0].chords.length, 1);
      T.assertArrayEq(Object.keys(out[0].mutes), ['t1']);
    });
    T.it('entrada no-array → lista vacía', () => {
      T.assertEq(S.sanitizeSections(null).length, 0);
    });
    T.it('conserva ids existentes y genera faltantes', () => {
      const out = S.sanitizeSections([{ id: 'x', chords: [] }, { chords: [] }]);
      T.assertEq(out[0].id, 'x');
      T.assert(out[1].id.length > 0);
    });
  });

  T.describe('song.flatten', () => {
    T.it('concatena secciones con repeticiones', () => {
      const f = S.flatten(twoSections());
      // A (2 acordes) ×2 + B (1 acorde) ×1 = 5 acordes aplanados.
      T.assertEq(f.chords.length, 5);
      T.assertEq(f.chords[0].root, 'C');
      T.assertEq(f.chords[2].root, 'C');   // segunda pasada de A
      T.assertEq(f.chords[4].root, 'G');
    });
    T.it('chordMap ubica cada acorde aplanado', () => {
      const f = S.flatten(twoSections());
      T.assertArrayEq(
        f.chordMap.map(m => m.sectionIdx + ':' + m.chordIdx + ':' + m.repeat),
        ['0:0:0', '0:1:0', '0:0:1', '0:1:1', '1:0:0']);
    });
    T.it('sectionSpans acumula compases correctamente', () => {
      const f = S.flatten(twoSections());
      // A dura 2 compases por pasada; B dura 2.
      T.assertArrayEq(f.sectionSpans.map(s => s.startBar + '+' + s.bars),
        ['0+2', '2+2', '4+2']);
    });
    T.it('secciones vacías no aportan compases', () => {
      const secs = twoSections();
      secs.splice(1, 0, { id: 'v', name: 'Vacía', repeats: 4, chords: [], mutes: {} });
      const f = S.flatten(secs);
      T.assertEq(f.chords.length, 5);
      T.assertEq(f.sectionSpans.length, 3);
    });
    T.it('sin secciones → todo vacío', () => {
      const f = S.flatten([]);
      T.assertEq(f.chords.length, 0);
      T.assertEq(f.sectionSpans.length, 0);
    });
  });

  T.describe('song.muteSpans / isMutedAt', () => {
    T.it('genera rangos de steps para las pistas muteadas', () => {
      const secs = twoSections();
      const f = S.flatten(secs);
      const m = S.muteSpans(secs, f.sectionSpans);
      // t2 muteada en las dos pasadas de A (compases 0-1 y 2-3).
      T.assertEq(m.t2.length, 2);
      T.assertEq(m.t2[0].startStep, 0);
      T.assertEq(m.t2[0].endStep, 32);
      T.assertEq(m.t2[1].startStep, 32);
      T.assertEq(m.t2[1].endStep, 64);
      T.assertEq(m.t1, undefined);
    });
    T.it('isMutedAt responde por step', () => {
      const secs = twoSections();
      const f = S.flatten(secs);
      const m = S.muteSpans(secs, f.sectionSpans);
      T.assertEq(S.isMutedAt(m, 't2', 0), true);
      T.assertEq(S.isMutedAt(m, 't2', 63), true);
      T.assertEq(S.isMutedAt(m, 't2', 64), false);   // sección B: suena
      T.assertEq(S.isMutedAt(m, 't1', 0), false);
      T.assertEq(S.isMutedAt(null, 't2', 0), false);
    });
  });

  T.describe('song.flattenedIndexOf', () => {
    T.it('encuentra la primera pasada de un acorde', () => {
      const f = S.flatten(twoSections());
      T.assertEq(S.flattenedIndexOf(f.chordMap, 0, 0), 0);
      T.assertEq(S.flattenedIndexOf(f.chordMap, 0, 1), 1);
      T.assertEq(S.flattenedIndexOf(f.chordMap, 1, 0), 4);
    });
    T.it('acorde inexistente → -1', () => {
      const f = S.flatten(twoSections());
      T.assertEq(S.flattenedIndexOf(f.chordMap, 2, 0), -1);
      T.assertEq(S.flattenedIndexOf(null, 0, 0), -1);
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
