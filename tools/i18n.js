// i18n.js — motor de traducción ES/EN compartido por todas las herramientas.
// IIFE, file:// safe. Sin ES modules, sin dependencias. Expone window.I18N.
//
// Uso en HTML:
//   <element data-i18n="clave">texto por defecto</element>
//   <input data-i18n-attr="placeholder:clave_ph;title:clave_t">
// Uso en JS dinámico:
//   I18N.t('clave')                         -> string traducido
//   window.addEventListener('i18n:changed', render)  -> re-render al cambiar idioma
//
// Cada página registra su diccionario:
//   I18N.register({ es: { clave: 'Hola' }, en: { clave: 'Hello' } });
(function (W) {
  'use strict';

  var LANG_KEY = 'harmonic_lang';
  var dict = { es: {}, en: {} };
  var lang = 'es';

  function detect() {
    try {
      var s = W.localStorage.getItem(LANG_KEY);
      if (s === 'es' || s === 'en') return s;
    } catch (e) {}
    return 'es'; // default español
  }

  function t(key) {
    if (dict[lang] && dict[lang][key] != null) return dict[lang][key];
    if (dict.es[key] != null) return dict.es[key]; // fallback al español
    return key;
  }

  function register(d) {
    ['es', 'en'].forEach(function (l) {
      if (!d[l]) return;
      for (var k in d[l]) { if (d[l].hasOwnProperty(k)) dict[l][k] = d[l][k]; }
    });
  }

  function apply(root) {
    var doc = W.document;
    root = root || doc;

    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });

    root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });

    root.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var i = pair.indexOf(':');
        if (i < 0) return;
        var attr = pair.slice(0, i).trim();
        var key = pair.slice(i + 1).trim();
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });

    if (doc.documentElement) doc.documentElement.setAttribute('lang', lang);
    updateButtonLabel();
  }

  function set(l) {
    lang = (l === 'en') ? 'en' : 'es';
    try { W.localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    apply();
    try { W.dispatchEvent(new Event('i18n:changed')); } catch (e) {}
  }

  function toggle() { set(lang === 'es' ? 'en' : 'es'); }

  var styleInjected = false;
  function injectStyle() {
    if (styleInjected) return;
    var doc = W.document;
    var css =
      '.i18n-toggle{position:fixed;top:14px;right:14px;z-index:9999;' +
      'min-width:42px;height:34px;padding:0 12px;' +
      "font-family:'Trebuchet MS','Segoe UI',sans-serif;font-size:13px;font-weight:700;" +
      'letter-spacing:0.08em;color:#e8d5b0;background:rgba(20,20,20,0.92);' +
      'border:1px solid #333;border-radius:8px;cursor:pointer;' +
      'transition:border-color .2s,color .2s,transform .15s;' +
      'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}' +
      '.i18n-toggle:hover{border-color:#d4a847;color:#d4a847;transform:translateY(-1px);}' +
      '.i18n-toggle:active{transform:translateY(0);}' +
      '@media(max-width:520px){.i18n-toggle{top:10px;right:10px;height:32px;}}';
    var s = doc.createElement('style');
    s.setAttribute('data-i18n-style', '');
    s.appendChild(doc.createTextNode(css));
    (doc.head || doc.documentElement).appendChild(s);
    styleInjected = true;
  }

  var btn = null;
  function updateButtonLabel() {
    if (!btn) return;
    btn.textContent = (lang === 'es') ? 'EN' : 'ES';
    btn.setAttribute('title', lang === 'es' ? 'Switch to English' : 'Cambiar a español');
    btn.setAttribute('aria-label', btn.getAttribute('title'));
  }

  function injectButton() {
    var doc = W.document;
    if (doc.getElementById('i18n-toggle')) { btn = doc.getElementById('i18n-toggle'); updateButtonLabel(); return btn; }
    injectStyle();
    btn = doc.createElement('button');
    btn.id = 'i18n-toggle';
    btn.type = 'button';
    btn.className = 'i18n-toggle';
    btn.addEventListener('click', toggle);
    (doc.body || doc.documentElement).appendChild(btn);
    updateButtonLabel();
    return btn;
  }

  function init() {
    injectButton();
    apply();
    // Re-render de contenido generado dinámicamente: las herramientas registran
    // el diccionario al final del body, después de que su JS ya construyó la UI
    // con I18N.t(). Disparar este evento hace que sus listeners 'i18n:changed'
    // re-rendericen ya con el diccionario cargado (sin esto se ven claves crudas).
    try { W.dispatchEvent(new Event('i18n:changed')); } catch (e) {}
  }

  // API pública
  W.I18N = {
    t: t,
    set: set,
    toggle: toggle,
    apply: apply,
    register: register,
    injectButton: injectButton,
    init: init,
    getLang: function () { return lang; }
  };

  lang = detect();

  // Auto-init cuando el DOM esté listo (las páginas pueden llamar I18N.init() antes
  // si quieren controlar el momento; init es idempotente para el botón).
  if (W.document) {
    if (W.document.readyState === 'loading') {
      W.document.addEventListener('DOMContentLoaded', function () {
        // Solo aplica traducciones; el botón lo inyecta cada página tras registrar su dict.
        apply();
      });
    }
  }
})(window);
