// Known localStorage keys across the guitar tools
export const KEYS = {
  CAGED:  'guitar_caged_state',
  IMPROV: 'guitar_improv_state',
};

export function save(key, state) {
  try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
}

export function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function saveCAGED(state) { save(KEYS.CAGED, state); }
export function loadCAGED()      { return load(KEYS.CAGED); }

export function loadImprovState() { return load(KEYS.IMPROV); }

// subscribe: listen for cross-tab changes to a key.
// NOTE: fires only in OTHER tabs, not in the same tab that wrote the value.
// Documented for future cross-tool reactivity; not used in v1.
export function subscribe(key, callback) {
  window.addEventListener('storage', e => {
    if (e.key === key) {
      try { callback(e.newValue ? JSON.parse(e.newValue) : null); } catch (err) {}
    }
  });
}
