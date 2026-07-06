// Tests de url-state — plain script, requiere test-runner.js + url-state.js.
(function (G) {
  const T = G.testRunner;
  const U = G.urlState;

  T.describe('urlState.encodeProgression', () => {
    T.it('ii–V–I básico', () => T.assertEq(
      U.encodeProgression([
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'C', quality: 'maj7', bars: 2 },
      ]),
      'Dm7-G7-Cmaj7*2'));
    T.it('sostenido → s', () => T.assertEq(
      U.encodeProgression([{ root: 'F#', quality: 'm7b5', bars: 1 }]),
      'Fsm7b5'));
    T.it('tríadas: mayor sin token, menor = m', () => T.assertEq(
      U.encodeProgression([
        { root: 'C', quality: 'major', bars: 1 },
        { root: 'A', quality: 'minor', bars: 1 },
      ]),
      'C-Am'));
    T.it('acorde inválido se omite', () => T.assertEq(
      U.encodeProgression([
        { root: 'C', quality: 'maj7', bars: 1 },
        { root: 'X', quality: 'rara', bars: 1 },
      ]),
      'Cmaj7'));
    T.it('entrada no-array → cadena vacía', () => T.assertEq(U.encodeProgression(null), ''));
    T.it('bars fuera de rango se acota a 8', () => T.assertEq(
      U.encodeProgression([{ root: 'C', quality: 'dom7', bars: 99 }]),
      'C7*8'));
  });

  T.describe('urlState.decodeProgression', () => {
    T.it('round-trip ii–V–I', () => T.assertArrayEq(
      U.decodeProgression('Dm7-G7-Cmaj7*2'),
      [
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
        { root: 'C', quality: 'maj7', bars: 2 },
      ]));
    T.it('s → sostenido', () => T.assertArrayEq(
      U.decodeProgression('Fsm7b5-B7'),
      [
        { root: 'F#', quality: 'm7b5', bars: 1 },
        { root: 'B', quality: 'dom7', bars: 1 },
      ]));
    T.it('m7b5 no se confunde con m7', () => T.assertEq(
      U.decodeProgression('Am7b5')[0].quality, 'm7b5'));
    T.it('dim7 no se confunde con dim', () => T.assertEq(
      U.decodeProgression('Cdim7')[0].quality, 'dim7'));
    T.it('bemol se acepta', () => T.assertEq(
      U.decodeProgression('Bbmaj7')[0].root, 'Bb'));
    T.it('token corrupto se ignora, el resto sobrevive', () => T.assertArrayEq(
      U.decodeProgression('Dm7-@@@-G7'),
      [
        { root: 'D', quality: 'min7', bars: 1 },
        { root: 'G', quality: 'dom7', bars: 1 },
      ]));
    T.it('nada parseable → null', () => T.assertEq(U.decodeProgression('@@@'), null));
    T.it('vacío / null → null', () => {
      T.assertEq(U.decodeProgression(''), null);
      T.assertEq(U.decodeProgression(null), null);
    });
    T.it('round-trip de todas las cualidades', () => {
      const all = ['maj7','min7','dom7','dim7','m7b5','major','minor','dim','aug']
        .map(q => ({ root: 'C', quality: q, bars: 1 }));
      T.assertArrayEq(U.decodeProgression(U.encodeProgression(all)), all);
    });
  });

  T.describe('urlState.parseHash / buildHash', () => {
    T.it('parsea pares clave=valor', () => {
      const p = U.parseHash('#p=Dm7-G7&b=120');
      T.assertEq(p.p, 'Dm7-G7');
      T.assertEq(p.b, '120');
    });
    T.it('acepta hash sin #', () => T.assertEq(U.parseHash('b=90').b, '90'));
    T.it('ignora pares sin =', () => {
      const p = U.parseHash('#suelto&b=90');
      T.assertEq(p.suelto, undefined);
      T.assertEq(p.b, '90');
    });
    T.it('hash vacío → objeto vacío', () => T.assertEq(Object.keys(U.parseHash('')).length, 0));
    T.it('buildHash omite null/vacío', () => T.assertEq(
      U.buildHash({ p: 'Cmaj7', b: null, x: '' }), '#p=Cmaj7'));
    T.it('buildHash sin params → cadena vacía', () => T.assertEq(U.buildHash({}), ''));
    T.it('round-trip con * y -', () => {
      const h = U.buildHash({ p: 'Dm7-G7-Cmaj7*2' });
      T.assertEq(h, '#p=Dm7-G7-Cmaj7*2');
      T.assertEq(U.parseHash(h).p, 'Dm7-G7-Cmaj7*2');
    });
  });

  T.describe('urlState.buildShareUrl', () => {
    T.it('agrega hash al href', () => T.assertEq(
      U.buildShareUrl('https://x.com/intervallic.html', { p: 'C7' }),
      'https://x.com/intervallic.html#p=C7'));
    T.it('reemplaza hash previo', () => T.assertEq(
      U.buildShareUrl('https://x.com/a.html#viejo=1', { p: 'C7' }),
      'https://x.com/a.html#p=C7'));
    T.it('sin params deja el href limpio', () => T.assertEq(
      U.buildShareUrl('https://x.com/a.html#viejo=1', {}),
      'https://x.com/a.html'));
  });

})(window.GuitarShared);
