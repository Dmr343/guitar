// localStorage helpers — works as plain script (file:// safe).
// Attaches to window.GuitarShared.storage.
(function (G) {
  const KEYS = {
    CAGED:  'guitar_caged_state',
    IMPROV: 'guitar_improv_state',
  };

  function save(key, state) {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
  }

  function load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveCAGED(state)    { save(KEYS.CAGED, state); }
  function loadCAGED()         { return load(KEYS.CAGED); }
  function loadImprovState()   { return load(KEYS.IMPROV); }

  // Cross-tab subscribe (fires only in OTHER tabs, never the writer)
  function subscribe(key, callback) {
    window.addEventListener('storage', e => {
      if (e.key === key) {
        try { callback(e.newValue ? JSON.parse(e.newValue) : null); } catch (err) {}
      }
    });
  }

  G.storage = { KEYS, save, load, saveCAGED, loadCAGED, loadImprovState, subscribe };
})(typeof window !== 'undefined'
    ? (window.GuitarShared = window.GuitarShared || {})
    : (globalThis.GuitarShared = globalThis.GuitarShared || {}));
