// Tests para el módulo humanize — IIFE, sin DOM ni audio.
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const humanize = W.BackingTrack && W.BackingTrack.humanize;
  if (!humanize) { console.error('BackingTrack.humanize not loaded'); return; }

  function sampleEvents() {
    return [
      { trackId: 'a', time: 1.0, velocity: 0.8, step: 0 },
      { trackId: 'a', time: 2.0, velocity: 0.6, step: 16 },
      { trackId: 'b', time: 0.5, velocity: 0.9, step: 8 },
    ];
  }

  T.describe('humanize.apply — intensidad nula', () => {
    T.it('amount 0 no cambia time ni velocity', () => {
      const out = humanize.apply(sampleEvents(), { amount: 0 });
      T.assertEq(out[0].time, 1.0);
      T.assertEq(out[1].velocity, 0.6);
    });
    T.it('sin opts equivale a amount 0', () => {
      const out = humanize.apply(sampleEvents());
      T.assertEq(out[2].time, 0.5);
    });
  });

  T.describe('humanize.apply — determinismo', () => {
    T.it('misma semilla + misma entrada → misma salida', () => {
      const a = humanize.apply(sampleEvents(), { amount: 1, seed: 42 });
      const b = humanize.apply(sampleEvents(), { amount: 1, seed: 42 });
      T.assertEq(JSON.stringify(a), JSON.stringify(b));
    });
    T.it('semillas distintas producen salidas distintas', () => {
      const a = humanize.apply(sampleEvents(), { amount: 1, seed: 1 });
      const b = humanize.apply(sampleEvents(), { amount: 1, seed: 2 });
      T.assert(JSON.stringify(a) !== JSON.stringify(b));
    });
  });

  T.describe('humanize.apply — pureza', () => {
    T.it('no muta la lista de entrada', () => {
      const input = sampleEvents();
      humanize.apply(input, { amount: 1, seed: 7 });
      T.assertEq(input[0].time, 1.0);
      T.assertEq(input[0].velocity, 0.8);
    });
  });

  T.describe('humanize.apply — rango de los offsets', () => {
    T.it('el timing se desplaza dentro de ±timeRange·amount', () => {
      const out = humanize.apply(sampleEvents(),
        { amount: 1, seed: 99, timeRange: 0.02 });
      const base = sampleEvents();
      out.forEach((e, i) => {
        const delta = Math.abs(e.time - base[i].time);
        T.assert(delta <= 0.02 + 1e-9, 'delta ' + delta + ' fuera de rango');
      });
    });
    T.it('la velocity queda dentro de 0..1', () => {
      const loud = [{ time: 1, velocity: 0.99 }, { time: 2, velocity: 0.02 }];
      const out = humanize.apply(loud, { amount: 1, seed: 5, velocityRange: 0.5 });
      out.forEach(e => {
        T.assert(e.velocity >= 0 && e.velocity <= 1,
          'velocity ' + e.velocity + ' fuera de 0..1');
      });
    });
    T.it('el timing nunca queda negativo', () => {
      const early = [{ time: 0.001, velocity: 0.5 }];
      const out = humanize.apply(early, { amount: 1, seed: 3, timeRange: 0.5 });
      T.assert(out[0].time >= 0);
    });
    T.it('más amount → más dispersión del timing', () => {
      const base = sampleEvents();
      const soft = humanize.apply(base, { amount: 0.1, seed: 11 });
      const hard = humanize.apply(base, { amount: 1, seed: 11 });
      const spread = (list) => list.reduce(
        (s, e, i) => s + Math.abs(e.time - base[i].time), 0);
      T.assert(spread(hard) > spread(soft));
    });
  });

  T.describe('humanize.apply — robustez', () => {
    T.it('entrada no-array devuelve lista vacía', () => {
      T.assertEq(humanize.apply(null, { amount: 1 }).length, 0);
    });
    T.it('conserva los demás campos del evento', () => {
      const out = humanize.apply(sampleEvents(), { amount: 1, seed: 1 });
      T.assertEq(out[0].trackId, 'a');
      T.assertEq(out[0].step, 0);
    });
  });

  T.describe('humanize.applySwing — corcheas a contratiempo', () => {
    // Un compás a 120 BPM: stepSeconds = (60/120)/4 = 0.125.
    const STEP = 0.125;
    function barEvents() {
      // Semicorcheas 0..7 del compás (dos pulsos completos).
      const out = [];
      for (let s = 0; s < 8; s++) {
        out.push({ time: s * STEP, step: s, velocity: 0.8 });
      }
      return out;
    }
    T.it('amount 0 no desplaza nada', () => {
      const out = humanize.applySwing(barEvents(), { amount: 0, stepSeconds: STEP });
      out.forEach((e, i) => T.assertEq(e.time, i * STEP));
    });
    T.it('amount 1 lleva la contra al tercer tresillo del pulso', () => {
      const out = humanize.applySwing(barEvents(), { amount: 1, stepSeconds: STEP });
      // step 2 (contra del pulso 1): de 1/2 a 2/3 del pulso.
      // Pulso = 4·STEP = 0.5s → 2/3 del pulso = 0.3333…
      T.assert(Math.abs(out[2].time - (2 / 3) * 0.5) < 1e-9,
        'contra en ' + out[2].time);
      // step 6 (contra del pulso 2): 0.5 + 1/3 = 0.8333…
      T.assert(Math.abs(out[6].time - (0.5 + (2 / 3) * 0.5)) < 1e-9);
    });
    T.it('los tiempos fuertes y las semicorcheas impares no se mueven', () => {
      const out = humanize.applySwing(barEvents(), { amount: 1, stepSeconds: STEP });
      [0, 1, 3, 4, 5, 7].forEach(s => T.assertEq(out[s].time, s * STEP));
    });
    T.it('amount 0.5 desplaza la mitad', () => {
      const out = humanize.applySwing(barEvents(), { amount: 0.5, stepSeconds: STEP });
      const full = (2 / 3) * STEP;
      T.assert(Math.abs(out[2].time - (2 * STEP + full / 2)) < 1e-9);
    });
    T.it('steps de compases siguientes también se desplazan (módulo 4)', () => {
      const ev = [{ time: 18 * STEP, step: 18, velocity: 0.8 }];  // compás 2, contra
      const out = humanize.applySwing(ev, { amount: 1, stepSeconds: STEP });
      T.assert(out[0].time > 18 * STEP);
    });
    T.it('no muta la entrada y conserva los demás campos', () => {
      const input = barEvents();
      const out = humanize.applySwing(input, { amount: 1, stepSeconds: STEP });
      T.assertEq(input[2].time, 2 * STEP);
      T.assertEq(out[2].velocity, 0.8);
      T.assertEq(out[2].step, 2);
    });
    T.it('sin stepSeconds válido devuelve clones sin cambios', () => {
      const out = humanize.applySwing(barEvents(), { amount: 1 });
      T.assertEq(out[2].time, 2 * STEP);
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
