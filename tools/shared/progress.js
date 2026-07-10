// progress.js — hilo de progreso compartido de la suite.
// Plain script, file:// safe. Se cuelga de window.GuitarShared.progress.
//
// Un contador liviano en localStorage, sin cuentas ni nube: racha de
// días de práctica seguidos y minutos acumulados (hoy y en total).
// Las herramientas suman tiempo mientras su transporte corre
// (addSeconds); el portal muestra un badge discreto (get).
//
// NOTA file://: Firefox aísla el localStorage de file:// POR ARCHIVO
// (cada .html es su propio origen), así que en local cada herramienta
// lleva su cuenta y el portal no la ve. En producción (un dominio,
// p. ej. harmonic.dadiabatic.com) todo comparte origen y el badge
// refleja la práctica de cualquier herramienta. Verificado headless.
//
// La lógica de racha/fechas es pura e inyectable (storage y "ahora")
// para poder testearla en Node sin reloj real.
(function (G) {

  const KEY = 'harmonic_progress';

  // Fecha local → 'YYYY-MM-DD'. La racha es de días de calendario del
  // usuario, no UTC: practicar a las 23:50 cuenta para ese día.
  function dayKey(d) {
    const x = d ? new Date(d) : new Date();
    const p = n => (n < 10 ? '0' : '') + n;
    return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate());
  }

  // Día anterior a una clave 'YYYY-MM-DD' (respeta meses/años/bisiestos).
  function prevDayKey(key) {
    const parts = String(key).split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() - 1);
    return dayKey(d);
  }

  // updateStreak — pura: aplica un día de práctica sobre el estado.
  // Mismo día → sin cambios; día siguiente → racha+1; hueco → racha 1.
  function updateStreak(state, todayKey) {
    const s = Object.assign({ lastDay: null, streak: 0, best: 0 }, state);
    if (s.lastDay === todayKey) return s;
    s.streak = (s.lastDay === prevDayKey(todayKey)) ? s.streak + 1 : 1;
    if (s.streak > s.best) s.best = s.streak;
    s.lastDay = todayKey;
    return s;
  }

  // createProgress — instancia con storage inyectable (tests) o
  // localStorage por defecto.
  function createProgress(opts) {
    opts = opts || {};
    const storage = opts.storage || {
      getItem(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
      setItem(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    };

    function load() {
      try {
        const raw = storage.getItem(KEY);
        const s = raw ? JSON.parse(raw) : null;
        return (s && typeof s === 'object') ? s : {};
      } catch (e) { return {}; }
    }
    function save(s) {
      try { storage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    }

    // addSeconds — suma tiempo de práctica y marca el día en la racha.
    // Con 0 segundos solo marca el día (touch al arrancar a tocar).
    function addSeconds(seconds, now) {
      const sec = Math.max(0, Number(seconds) || 0);
      const today = dayKey(now);
      let s = load();
      s = updateStreak(s, today);
      if (s.day !== today) { s.day = today; s.secondsToday = 0; }
      s.secondsToday = (Number(s.secondsToday) || 0) + sec;
      s.secondsTotal = (Number(s.secondsTotal) || 0) + sec;
      save(s);
      return s;
    }
    function touch(now) { return addSeconds(0, now); }

    // get — resumen para la UI. La racha "vigente" sigue viva si la
    // última práctica fue hoy o ayer; con un hueco se lee 0 (aunque
    // best conserva el récord).
    function get(now) {
      const s = load();
      const today = dayKey(now);
      const alive = s.lastDay === today || s.lastDay === prevDayKey(today);
      const secondsToday = (s.day === today) ? (Number(s.secondsToday) || 0) : 0;
      return {
        streak: alive ? (Number(s.streak) || 0) : 0,
        best: Number(s.best) || 0,
        practicedToday: s.lastDay === today,
        minutesToday: Math.floor(secondsToday / 60),
        minutesTotal: Math.floor((Number(s.secondsTotal) || 0) / 60),
      };
    }

    return { addSeconds, touch, get, KEY };
  }

  // startTracking — helper para las herramientas: llamar con true al
  // arrancar el transporte y false al parar. Marca el día al arrancar
  // y suma tiempo cada 30 s mientras corre.
  const TICK_SECONDS = 30;
  function makeTracker(progress) {
    let timer = null;
    return function setActive(active) {
      if (active && !timer) {
        progress.touch();
        timer = setInterval(function () {
          progress.addSeconds(TICK_SECONDS);
        }, TICK_SECONDS * 1000);
      } else if (!active && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }

  const instance = createProgress();
  G.progress = {
    addSeconds: instance.addSeconds,
    touch: instance.touch,
    get: instance.get,
    trackTransport: makeTracker(instance),
    // puros / inyectables, para tests
    createProgress, updateStreak, dayKey, prevDayKey,
    KEY, TICK_SECONDS,
  };

})(window.GuitarShared = window.GuitarShared || {});
