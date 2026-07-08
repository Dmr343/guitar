// theme.js — tema claro opcional (window.Theme). Plain script, file:// safe.
//
// El dark-estudio sigue siendo el default y la identidad; el claro es
// opt-in vía <html data-theme="light">, con los overrides de tokens en
// theme.css. Se carga en el <head> (es diminuto) para aplicar el tema
// ANTES del primer paint — sin flash oscuro al abrir en modo claro.
// El botón flotante se inyecta recién en DOMContentLoaded.
(function (W) {
  'use strict';

  var KEY = 'harmonic_theme';
  var theme = 'dark';
  try { if (W.localStorage.getItem(KEY) === 'light') theme = 'light'; } catch (e) {}

  function applyToRoot() {
    var root = W.document.documentElement;
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
  }
  applyToRoot();   // inmediato: antes del primer paint

  function set(t) {
    theme = (t === 'light') ? 'light' : 'dark';
    try { W.localStorage.setItem(KEY, theme); } catch (e) {}
    applyToRoot();
    updateButton();
    try { W.dispatchEvent(new Event('theme:changed')); } catch (e) {}
  }
  function toggle() { set(theme === 'light' ? 'dark' : 'light'); }
  function current() { return theme; }

  // Íconos inline (sin emoji): sol para "pasar a claro", luna para volver.
  var SUN = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/></svg>';

  var btn = null;
  function updateButton() {
    if (!btn) return;
    btn.innerHTML = (theme === 'light') ? MOON : SUN;
    var title = (theme === 'light') ? 'Tema oscuro' : 'Tema claro';
    btn.setAttribute('title', title);
    btn.setAttribute('aria-label', title);
  }

  function injectButton() {
    var doc = W.document;
    if (!doc.body || doc.getElementById('theme-toggle')) return;
    var css =
      '.theme-toggle{position:absolute;top:14px;right:110px;z-index:90;' +
      'width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;' +
      'color:var(--text-mid,#a39d90);background:var(--surface2,rgba(20,20,20,0.92));' +
      'border:1px solid var(--border2,#34343d);border-radius:8px;cursor:pointer;' +
      'transition:border-color .2s,color .2s,transform .15s;' +
      'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}' +
      '.theme-toggle:hover{border-color:var(--gold,#e0b24a);color:var(--gold,#e0b24a);transform:translateY(-1px);}' +
      '.theme-toggle:focus-visible{outline:2px solid var(--gold,#e0b24a);outline-offset:2px;}' +
      '@media(max-width:760px){.theme-toggle{top:10px;right:94px;width:32px;height:32px;}}';
    var s = doc.createElement('style');
    s.setAttribute('data-theme-style', '');
    s.appendChild(doc.createTextNode(css));
    (doc.head || doc.documentElement).appendChild(s);
    btn = doc.createElement('button');
    btn.id = 'theme-toggle';
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.addEventListener('click', toggle);
    doc.body.appendChild(btn);
    updateButton();
  }

  if (W.document.readyState === 'loading') {
    W.document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }

  W.Theme = { set: set, toggle: toggle, current: current, KEY: KEY };
})(window);
