// Regression tests for the global namespace contract.
// If someone re-introduces ES modules in shared/*.js (which breaks file://
// loading), these tests will fail because the IIFE pattern wouldn't have run.
(function (G) {
  const T = G.testRunner;

  T.describe('window.GuitarShared namespace contract', () => {
    T.it('GuitarShared exists', () => T.assert(typeof G === 'object' && G !== null));
    T.it('theory submodule attached',     () => T.assert(typeof G.theory     === 'object'));
    T.it('fretboard submodule attached',  () => T.assert(typeof G.fretboard  === 'object'));
    T.it('storage submodule attached',    () => T.assert(typeof G.storage    === 'object'));
    T.it('metronome submodule attached',  () => T.assert(typeof G.metronome  === 'object'));
    T.it('testRunner attached',           () => T.assert(typeof G.testRunner === 'object'));
  });

  T.describe('theory exports — minimum surface', () => {
    const required = [
      'CHROMATIC', 'MAJOR_STEPS', 'MINOR_STEPS',
      'PENTATONIC_MAJOR_STEPS', 'PENTATONIC_MINOR_STEPS',
      'MIXOLYDIAN_STEPS', 'DORIAN_STEPS',
      'CAGED_COLORS', 'FUNC_COLORS', 'QUALITY_LABELS', 'QUALITY_SUFFIX',
      'chordColor', 'buildScale', 'buildChord', 'intervalToFunction',
      'cagedShapeFor', 'fretsForCagedShape', 'chordName',
      'commonChordTones', 'pickScaleForChord', 'advanceChord',
    ];
    required.forEach(key => {
      T.it(`theory.${key} exists`, () => T.assert(G.theory[key] !== undefined));
    });
  });

  T.describe('fretboard exports — minimum surface', () => {
    const required = [
      'OPEN_NOTES', 'STRING_LABELS', 'FRET_MARKERS', 'STRING_THICK',
      'FB_W', 'FB_H', 'FB_NUT', 'FB_RIGHT', 'FB_STR_TOP', 'FB_STR_BOT', 'FB_STR_GAP',
      'fbNoteAt', 'fretX', 'stringY', 'fbGetFretW', 'fbGetDotsGroup',
      'fbInitBoard', 'chordToFbPositions', 'fbRenderChordDots',
      'fbDrawBarre', 'fbRenderFunctionalDot',
    ];
    required.forEach(key => {
      T.it(`fretboard.${key} exists`, () => T.assert(G.fretboard[key] !== undefined));
    });
  });

  T.describe('storage exports', () => {
    const required = ['KEYS', 'save', 'load', 'saveCAGED', 'loadCAGED', 'loadImprovState', 'subscribe'];
    required.forEach(key => {
      T.it(`storage.${key} exists`, () => T.assert(G.storage[key] !== undefined));
    });
    T.it('KEYS.CAGED is correct',   () => T.assertEq(G.storage.KEYS.CAGED, 'guitar_caged_state'));
    T.it('KEYS.IMPROV is correct',  () => T.assertEq(G.storage.KEYS.IMPROV, 'guitar_improv_state'));
  });

  T.describe('metronome exports', () => {
    T.it('Metronome class attached', () => T.assertEq(typeof G.metronome.Metronome, 'function'));
    T.it('Metronome instance has start/stop', () => {
      const m = new G.metronome.Metronome();
      T.assertEq(typeof m.start, 'function');
      T.assertEq(typeof m.stop,  'function');
    });
  });
})(typeof window !== 'undefined' ? window.GuitarShared : globalThis.GuitarShared);
