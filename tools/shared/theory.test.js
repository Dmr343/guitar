// Theory tests — plain script, depends on test-runner.js + theory.js loaded first.
(function (G) {
  const T = G.testRunner;
  const {
    CHROMATIC, buildScale, buildChord, intervalToFunction, chordColor, cagedShapeFor,
  } = G.theory;

  T.describe('CHROMATIC', () => {
    T.it('has 12 notes', () => T.assertEq(CHROMATIC.length, 12));
    T.it('starts with C', () => T.assertEq(CHROMATIC[0], 'C'));
    T.it('ends with B',   () => T.assertEq(CHROMATIC[11], 'B'));
  });

  T.describe('buildScale — major / minor', () => {
    T.it('C major', () => T.assertArrayEq(buildScale('C', 'major'), ['C','D','E','F','G','A','B']));
    T.it('G major', () => T.assertArrayEq(buildScale('G', 'major'), ['G','A','B','C','D','E','F#']));
    T.it('A minor', () => T.assertArrayEq(buildScale('A', 'minor'), ['A','B','C','D','E','F','G']));
  });

  T.describe('buildScale — pentatónica', () => {
    T.it('G pent_major', () => T.assertArrayEq(buildScale('G', 'pent_major'), ['G','A','B','D','E']));
    T.it('E pent_minor', () => T.assertArrayEq(buildScale('E', 'pent_minor'), ['E','G','A','B','D']));
    T.it('5 notes',      () => T.assertEq(buildScale('A', 'pent_minor').length, 5));
  });

  T.describe('buildScale — modos', () => {
    T.it('G mixolydian', () => T.assertArrayEq(buildScale('G', 'mixolydian'), ['G','A','B','C','D','E','F']));
    T.it('A dorian',     () => T.assertArrayEq(buildScale('A', 'dorian'),     ['A','B','C','D','E','F#','G']));
    T.it('7 notes each', () => {
      T.assertEq(buildScale('D', 'mixolydian').length, 7);
      T.assertEq(buildScale('D', 'dorian').length, 7);
    });
  });

  T.describe('buildChord', () => {
    T.it('C major — notas', () => {
      const c = buildChord('C', 'major');
      T.assertArrayEq(c.notes, ['C','E','G']);
      T.assertArrayEq(c.intervals, ['1','3','5']);
    });
    T.it('D minor — notas', () => {
      const c = buildChord('D', 'minor');
      T.assertArrayEq(c.notes, ['D','F','A']);
      T.assertArrayEq(c.intervals, ['1','b3','5']);
    });
    T.it('G dom7 — notas', () => {
      const c = buildChord('G', 'dom7');
      T.assertArrayEq(c.notes, ['G','B','D','F']);
      T.assertArrayEq(c.intervals, ['1','3','5','b7']);
    });
    T.it('F maj7 — notas', () => {
      const c = buildChord('F', 'maj7');
      T.assertArrayEq(c.notes, ['F','A','C','E']);
      T.assertArrayEq(c.intervals, ['1','3','5','7']);
    });
    T.it('E min7 — notas', () => {
      const c = buildChord('E', 'min7');
      T.assertArrayEq(c.notes, ['E','G','B','D']);
      T.assertArrayEq(c.intervals, ['1','b3','5','b7']);
    });
    T.it('root / quality preservados', () => {
      const c = buildChord('A', 'minor');
      T.assertEq(c.root, 'A');
      T.assertEq(c.quality, 'minor');
    });
  });

  T.describe('intervalToFunction', () => {
    T.it("'1' → 'R'",    () => T.assertEq(intervalToFunction('1'),   'R'));
    T.it("'3' → '3'",    () => T.assertEq(intervalToFunction('3'),   '3'));
    T.it("'b3' → '3'",   () => T.assertEq(intervalToFunction('b3'),  '3'));
    T.it("'5' → '5'",    () => T.assertEq(intervalToFunction('5'),   '5'));
    T.it("'b5' → '5'",   () => T.assertEq(intervalToFunction('b5'),  '5'));
    T.it("'7' → '7'",    () => T.assertEq(intervalToFunction('7'),   '7'));
    T.it("'b7' → '7'",   () => T.assertEq(intervalToFunction('b7'),  '7'));
    T.it("'2' → null",   () => T.assertEq(intervalToFunction('2'),   null));
    T.it("'4' → null",   () => T.assertEq(intervalToFunction('4'),   null));
  });

  T.describe('chordColor', () => {
    T.it('roots distintas → colores distintos', () =>
      T.assert(chordColor('C', 'major') !== chordColor('G', 'major')));
    T.it('mayor vs menor → colores distintos', () =>
      T.assert(chordColor('A', 'major') !== chordColor('A', 'minor')));
    T.it('devuelve string hsl', () =>
      T.assert(chordColor('E', 'major').startsWith('hsl(')));
  });

  T.describe('cagedShapeFor G mayor', () => {
    T.it('returns 5 shapes', () => T.assertEq(cagedShapeFor('G').length, 5));
    T.it('E-shape barre 3',  () => T.assertEq(cagedShapeFor('G').find(s => s.shape === 'E').barre, 3));
    T.it('A-shape barre 10', () => T.assertEq(cagedShapeFor('G').find(s => s.shape === 'A').barre, 10));
    T.it('G-shape barre 12', () => T.assertEq(cagedShapeFor('G').find(s => s.shape === 'G').barre, 12));
    T.it('C-shape barre 7',  () => T.assertEq(cagedShapeFor('G').find(s => s.shape === 'C').barre, 7));
    T.it('D-shape barre 5',  () => T.assertEq(cagedShapeFor('G').find(s => s.shape === 'D').barre, 5));
    T.it('cada shape tiene fretRange', () => {
      cagedShapeFor('G').forEach(s => {
        T.assert(Array.isArray(s.fretRange) && s.fretRange.length === 2);
      });
    });
  });
})(typeof window !== 'undefined' ? window.GuitarShared : globalThis.GuitarShared);
