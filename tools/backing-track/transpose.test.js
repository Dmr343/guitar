// Tests para BackingTrack.transpose — IIFE, sin DOM ni audio.
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const transpose = W.BackingTrack && W.BackingTrack.transpose;
  if (!transpose) { console.error('BackingTrack.transpose not loaded'); return; }

  const armonizacion = {
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
  };

  T.describe('transpose.realizeProgression — armonización mayor', () => {
    T.it('en C devuelve raíces C D E F G A B', () => {
      const roots = transpose.realizeProgression(armonizacion).map(c => c.root);
      T.assertArrayEq(roots, ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    });
    T.it('en G devuelve raíces G A B C D E F# (tonalidad de sostenidos)', () => {
      const roots = transpose.realizeProgression(armonizacion, 'G').map(c => c.root);
      T.assertArrayEq(roots, ['G', 'A', 'B', 'C', 'D', 'E', 'F#']);
    });
    T.it('en Eb devuelve raíces Eb F G Ab Bb C D (tonalidad de bemoles)', () => {
      const roots = transpose.realizeProgression(armonizacion, 'Eb').map(c => c.root);
      T.assertArrayEq(roots, ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D']);
    });
    T.it('el primero respeta la cualidad maj7 y el último m7b5', () => {
      const out = transpose.realizeProgression(armonizacion, 'G');
      T.assertEq(out[0].quality, 'maj7');
      T.assertEq(out[6].quality, 'm7b5');
    });
    T.it('preserva bars (no toca el campo)', () => {
      const out = transpose.realizeProgression(armonizacion, 'Eb');
      T.assertEq(out[3].bars, 1);
    });
  });

  T.describe('transpose.realizeChord — dominantes secundarios', () => {
    // Nota: la sección 6 del prompt sugería que V/ii en G debía dar B7, pero
    // B7 es V/vi en G (V de Em). El algoritmo del prompt (sección 1.3) y la
    // teoría coinciden en que V/ii en G = V de Am = E7. Se documentó la
    // corrección con el usuario antes de migrar el catálogo.
    T.it('V/ii dom7 en C = A7', () => {
      const r = transpose.realizeChord({ grado: 'V/ii', quality: 'dom7' }, 'C', 'major');
      T.assertEq(r.root, 'A');
      T.assertEq(r.quality, 'dom7');
    });
    T.it('V/ii dom7 en G = E7 (no B7 — B7 es V/vi)', () => {
      const r = transpose.realizeChord({ grado: 'V/ii', quality: 'dom7' }, 'G', 'major');
      T.assertEq(r.root, 'E');
    });
    T.it('V/vi dom7 en G = B7 (el V del relativo menor Em)', () => {
      const r = transpose.realizeChord({ grado: 'V/vi', quality: 'dom7' }, 'G', 'major');
      T.assertEq(r.root, 'B');
    });
    T.it('V/V dom7 en C = D7', () => {
      const r = transpose.realizeChord({ grado: 'V/V', quality: 'dom7' }, 'C', 'major');
      T.assertEq(r.root, 'D');
    });
  });

  T.describe('transpose.realizeChord — alteraciones cromáticas', () => {
    T.it('bIII en C mayor = Eb (la b fuerza grafía con bemol)', () => {
      const r = transpose.realizeChord({ grado: 'bIII', quality: 'maj7' }, 'C', 'major');
      T.assertEq(r.root, 'Eb');
    });
    T.it('bVI en C mayor = Ab', () => {
      const r = transpose.realizeChord({ grado: 'bVI', quality: 'maj7' }, 'C', 'major');
      T.assertEq(r.root, 'Ab');
    });
    T.it('bII en E menor = F (préstamo frigio)', () => {
      const r = transpose.realizeChord({ grado: 'bII', quality: 'major' }, 'E', 'minor');
      T.assertEq(r.root, 'F');
    });
    T.it('#IV en C mayor = F# (la # fuerza grafía con sostenido)', () => {
      const r = transpose.realizeChord({ grado: '#IV', quality: 'major' }, 'C', 'major');
      T.assertEq(r.root, 'F#');
    });
    T.it('#vii en E menor = D# (cromática menor)', () => {
      const r = transpose.realizeChord({ grado: '#vii', quality: 'm7b5' }, 'E', 'minor');
      T.assertEq(r.root, 'D#');
    });
  });

  T.describe('transpose.realizeChord — modo menor', () => {
    T.it('III mayor en A menor = C', () => {
      const r = transpose.realizeChord({ grado: 'III', quality: 'major' }, 'A', 'minor');
      T.assertEq(r.root, 'C');
    });
    T.it('VII mayor en A menor = G (no F#)', () => {
      const r = transpose.realizeChord({ grado: 'VII', quality: 'major' }, 'A', 'minor');
      T.assertEq(r.root, 'G');
    });
    T.it('iv en D menor = G', () => {
      const r = transpose.realizeChord({ grado: 'iv', quality: 'min7' }, 'D', 'minor');
      T.assertEq(r.root, 'G');
    });
    T.it('bii en D menor = Eb (So What)', () => {
      const r = transpose.realizeChord({ grado: 'bii', quality: 'min7' }, 'D', 'minor');
      T.assertEq(r.root, 'Eb');
    });
  });

  T.describe('transpose.realizeProgression — Autumn Leaves', () => {
    // Why: caso de prueba que ejercita vii°, V/vi y vi en una misma
    // progresión — los tres grados que en el prompt aparecían como
    // #iv°/VII/iii (erróneos respecto al algoritmo).
    const autumn = {
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
    };
    T.it('en G mayor produce Am-D-G-C-F#-B-E (los acordes clásicos)', () => {
      const roots = transpose.realizeProgression(autumn).map(c => c.root);
      T.assertArrayEq(roots, ['A', 'D', 'G', 'C', 'F#', 'B', 'E']);
    });
  });

  T.describe('transpose.realizeProgression — passthrough no transponible', () => {
    // Why: la "ii–V–I en las 12 tonalidades" recorre las 12 — transponerlo
    // rompe el ejercicio. Marcado con transponible:false, los root fijos
    // se entregan sin tocar.
    const fixed = {
      tonalidad: 'C', modo: 'major', transponible: false,
      chords: [
        { root: 'D',  quality: 'min7', bars: 1 },
        { root: 'Eb', quality: 'dom7', bars: 1 },
        { root: 'F#', quality: 'maj7', bars: 1 },
      ],
    };
    T.it('ignora la tonalidad destino y devuelve los root fijos', () => {
      const roots = transpose.realizeProgression(fixed, 'A').map(c => c.root);
      T.assertArrayEq(roots, ['D', 'Eb', 'F#']);
    });
  });

  T.describe('transpose.gradoSemitone — sanidad del mapeo base', () => {
    T.it('en mayor: I=0 ii=2 iii=4 IV=5 V=7 vi=9 vii°=11', () => {
      T.assertEq(transpose.gradoSemitone('I', 'major'), 0);
      T.assertEq(transpose.gradoSemitone('ii', 'major'), 2);
      T.assertEq(transpose.gradoSemitone('iii', 'major'), 4);
      T.assertEq(transpose.gradoSemitone('IV', 'major'), 5);
      T.assertEq(transpose.gradoSemitone('V', 'major'), 7);
      T.assertEq(transpose.gradoSemitone('vi', 'major'), 9);
      T.assertEq(transpose.gradoSemitone('vii°', 'major'), 11);
    });
    T.it('en menor: i=0 ii°=2 III=3 iv=5 v=7 VI=8 VII=10', () => {
      T.assertEq(transpose.gradoSemitone('i', 'minor'), 0);
      T.assertEq(transpose.gradoSemitone('ii°', 'minor'), 2);
      T.assertEq(transpose.gradoSemitone('III', 'minor'), 3);
      T.assertEq(transpose.gradoSemitone('iv', 'minor'), 5);
      T.assertEq(transpose.gradoSemitone('v', 'minor'), 7);
      T.assertEq(transpose.gradoSemitone('VI', 'minor'), 8);
      T.assertEq(transpose.gradoSemitone('VII', 'minor'), 10);
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
