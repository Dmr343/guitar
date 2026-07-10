// Tests de progress — lógica pura con storage y reloj inyectados.
(function (G) {
  const T = G.testRunner;
  const P = G.progress;

  function memStorage() {
    const m = new Map();
    return {
      getItem: k => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      _m: m,
    };
  }

  T.describe('progress.dayKey / prevDayKey', () => {
    T.it('formato local YYYY-MM-DD', () => {
      T.assertEq(P.dayKey(new Date(2026, 6, 10, 23, 50)), '2026-07-10');
      T.assertEq(P.dayKey(new Date(2026, 0, 5)), '2026-01-05');
    });
    T.it('día anterior cruza meses y años', () => {
      T.assertEq(P.prevDayKey('2026-07-10'), '2026-07-09');
      T.assertEq(P.prevDayKey('2026-07-01'), '2026-06-30');
      T.assertEq(P.prevDayKey('2026-01-01'), '2025-12-31');
      T.assertEq(P.prevDayKey('2024-03-01'), '2024-02-29');   // bisiesto
    });
  });

  T.describe('progress.updateStreak (pura)', () => {
    T.it('primer día → racha 1', () => {
      const s = P.updateStreak({}, '2026-07-10');
      T.assertEq(s.streak, 1);
      T.assertEq(s.best, 1);
      T.assertEq(s.lastDay, '2026-07-10');
    });
    T.it('mismo día no suma', () => {
      const s = P.updateStreak({ lastDay: '2026-07-10', streak: 3, best: 5 }, '2026-07-10');
      T.assertEq(s.streak, 3);
    });
    T.it('día consecutivo suma y actualiza el récord', () => {
      const s = P.updateStreak({ lastDay: '2026-07-10', streak: 5, best: 5 }, '2026-07-11');
      T.assertEq(s.streak, 6);
      T.assertEq(s.best, 6);
    });
    T.it('un hueco resetea la racha pero conserva el récord', () => {
      const s = P.updateStreak({ lastDay: '2026-07-08', streak: 9, best: 9 }, '2026-07-10');
      T.assertEq(s.streak, 1);
      T.assertEq(s.best, 9);
    });
  });

  T.describe('progress.createProgress — acumulación', () => {
    T.it('addSeconds acumula hoy y total; get lo lee en minutos', () => {
      const p = P.createProgress({ storage: memStorage() });
      const now = new Date(2026, 6, 10, 10, 0);
      p.addSeconds(90, now);
      p.addSeconds(45, now);
      const g = p.get(now);
      T.assertEq(g.minutesToday, 2);        // 135 s
      T.assertEq(g.minutesTotal, 2);
      T.assertEq(g.streak, 1);
      T.assertEq(g.practicedToday, true);
    });
    T.it('el contador de hoy se reinicia al día siguiente; el total no', () => {
      const p = P.createProgress({ storage: memStorage() });
      p.addSeconds(120, new Date(2026, 6, 10));
      p.addSeconds(60, new Date(2026, 6, 11));
      const g = p.get(new Date(2026, 6, 11));
      T.assertEq(g.minutesToday, 1);
      T.assertEq(g.minutesTotal, 3);
      T.assertEq(g.streak, 2);
    });
    T.it('touch marca el día sin sumar tiempo', () => {
      const p = P.createProgress({ storage: memStorage() });
      p.touch(new Date(2026, 6, 10));
      const g = p.get(new Date(2026, 6, 10));
      T.assertEq(g.streak, 1);
      T.assertEq(g.minutesToday, 0);
    });
    T.it('la racha se lee 0 tras un hueco, pero sigue viva "ayer"', () => {
      const p = P.createProgress({ storage: memStorage() });
      p.touch(new Date(2026, 6, 8));
      p.touch(new Date(2026, 6, 9));
      T.assertEq(p.get(new Date(2026, 6, 10)).streak, 2);   // ayer: viva
      T.assertEq(p.get(new Date(2026, 6, 12)).streak, 0);   // hueco: cortada
      T.assertEq(p.get(new Date(2026, 6, 12)).best, 2);
    });
    T.it('storage corrupto cae a estado limpio', () => {
      const st = memStorage();
      st.setItem(P.KEY, '{roto');
      const p = P.createProgress({ storage: st });
      const g = p.get(new Date(2026, 6, 10));
      T.assertEq(g.streak, 0);
      T.assertEq(g.minutesTotal, 0);
    });
  });

})(window.GuitarShared);
