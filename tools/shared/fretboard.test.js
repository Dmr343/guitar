// Fretboard tests — plain script, depends on test-runner.js + fretboard.js loaded first.
(function (G) {
  const T = G.testRunner;
  const { fbNoteAt, chordToFbPositions } = G.fretboard;

  T.describe('fbNoteAt', () => {
    T.it('E string fret 3 = G',  () => T.assertEq(fbNoteAt('E', 3),  'G'));
    T.it('A string fret 7 = E',  () => T.assertEq(fbNoteAt('A', 7),  'E'));
    T.it('E string fret 0 = E',  () => T.assertEq(fbNoteAt('E', 0),  'E'));
    T.it('G string fret 2 = A',  () => T.assertEq(fbNoteAt('G', 2),  'A'));
    T.it('B string fret 3 = D',  () => T.assertEq(fbNoteAt('B', 3),  'D'));
    T.it('D string fret 5 = G',  () => T.assertEq(fbNoteAt('D', 5),  'G'));
    T.it('wrap 12 = same as 0',  () => T.assertEq(fbNoteAt('E', 12), 'E'));
  });

  T.describe('chordToFbPositions — G major open', () => {
    const g = { strings: [3, 0, 0, 0, 2, 3], notes: ['G', 'B', 'D'], quality: 'major' };

    T.it('6 positions (no muted strings)', () => T.assertEq(chordToFbPositions(g).length, 6));

    T.it('low E (si=0) = G at fret 3, degree 1', () => {
      const pos = chordToFbPositions(g);
      const lowE = pos.find(p => p.si === 0);
      T.assertEq(lowE.note, 'G');
      T.assertEq(lowE.fret, 3);
      T.assertEq(lowE.d, 1);
    });

    T.it('high e (si=5) = G at fret 3, degree 1', () => {
      const pos = chordToFbPositions(g);
      const hiE = pos.find(p => p.si === 5);
      T.assertEq(hiE.note, 'G');
      T.assertEq(hiE.fret, 3);
      T.assertEq(hiE.d, 1);
    });

    T.it('A string (si=1) = B at fret 2', () => {
      const pos = chordToFbPositions(g);
      const a = pos.find(p => p.si === 1);
      T.assertEq(a.note, 'B');
      T.assertEq(a.fret, 2);
    });
  });

  T.describe('chordToFbPositions — Am open', () => {
    const am = { strings: [0, 1, 2, 2, 0, 'x'], notes: ['A', 'C', 'E'], quality: 'minor' };

    T.it('5 positions (low E muted)', () => T.assertEq(chordToFbPositions(am).length, 5));

    T.it('A string (si=1) = A at fret 0, degree 1', () => {
      const pos = chordToFbPositions(am);
      const a = pos.find(p => p.si === 1);
      T.assertEq(a.note, 'A');
      T.assertEq(a.fret, 0);
      T.assertEq(a.d, 1);
    });
  });
})(typeof window !== 'undefined' ? window.GuitarShared : globalThis.GuitarShared);
