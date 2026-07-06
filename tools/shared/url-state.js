// url-state.js — estado compartible en la URL (hash) para las herramientas.
// Plain script, file:// safe. Se cuelga de window.GuitarShared.urlState.
//
// Formato del hash: #k1=v1&k2=v2  (valores URI-encoded).
// La progresión se codifica compacta y legible: "Dm7-G7-Cmaj7*2"
//   raíz  = A–G + 's' (sostenido) o 'b' (bemol):  Cs = C#, Bb = B♭
//   calidad = token corto (m7, 7, maj7, dim7, m7b5, m, dim, aug, '' = mayor)
//   bars  = sufijo '*n' opcional (default 1)
(function (G) {

  // token de calidad ↔ calidad interna. Orden de decode: probar el token
  // MÁS LARGO primero (m7b5 antes que m7, dim7 antes que dim, m7 antes que m).
  const QUALITY_TO_TOKEN = {
    maj7: 'maj7', min7: 'm7', dom7: '7', dim7: 'dim7', m7b5: 'm7b5',
    major: '', minor: 'm', dim: 'dim', aug: 'aug',
  };
  const TOKEN_TO_QUALITY = {};
  Object.keys(QUALITY_TO_TOKEN).forEach(q => { TOKEN_TO_QUALITY[QUALITY_TO_TOKEN[q]] = q; });
  const TOKENS_BY_LENGTH = Object.keys(TOKEN_TO_QUALITY)
    .sort((a, b) => b.length - a.length);  // '' queda al final

  // 'C#' → 'Cs' para no meter '#' dentro del fragment de la URL.
  function encodeRoot(root) { return String(root).replace('#', 's'); }
  function decodeRoot(raw)  { return String(raw).replace('s', '#'); }

  // [{root,quality,bars}] → 'Dm7-G7-Cmaj7*2'. Acordes inválidos se omiten.
  function encodeProgression(chords) {
    if (!Array.isArray(chords)) return '';
    return chords.map(c => {
      if (!c || !c.root) return null;
      const token = QUALITY_TO_TOKEN[c.quality];
      if (token === undefined) return null;
      const bars = Math.max(1, Math.min(8, Number(c.bars) || 1));
      return encodeRoot(c.root) + token + (bars > 1 ? '*' + bars : '');
    }).filter(Boolean).join('-');
  }

  // 'Dm7-G7-Cmaj7*2' → [{root,quality,bars}] o null si nada es parseable.
  function decodeProgression(str) {
    if (!str || typeof str !== 'string') return null;
    const out = [];
    for (const tokenRaw of str.split('-')) {
      const m = /^([A-G][sb]?)([a-z0-9]*)(?:\*(\d))?$/.exec(tokenRaw.trim());
      if (!m) continue;
      const rest = m[2];
      const qToken = TOKENS_BY_LENGTH.find(t => t === rest);
      if (qToken === undefined) continue;
      out.push({
        root: decodeRoot(m[1]),
        quality: TOKEN_TO_QUALITY[qToken],
        bars: Math.max(1, Math.min(8, Number(m[3]) || 1)),
      });
    }
    return out.length ? out : null;
  }

  // '#p=Dm7-G7&b=120' → { p: 'Dm7-G7', b: '120' }. Tolerante: entradas sin
  // '=' o vacías se ignoran. Acepta el hash con o sin '#' inicial.
  function parseHash(hash) {
    const out = {};
    if (!hash || typeof hash !== 'string') return out;
    const body = hash.charAt(0) === '#' ? hash.slice(1) : hash;
    for (const pair of body.split('&')) {
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const k = pair.slice(0, eq);
      try { out[k] = decodeURIComponent(pair.slice(eq + 1)); }
      catch (e) { /* valor malformado → se ignora */ }
    }
    return out;
  }

  // { p: 'Dm7-G7', b: 120 } → '#p=Dm7-G7&b=120'. Omite null/undefined/''.
  function buildHash(params) {
    const parts = [];
    Object.keys(params || {}).forEach(k => {
      const v = params[k];
      if (v === null || v === undefined || v === '') return;
      parts.push(k + '=' + encodeURIComponent(String(v))
        .replace(/%2A/g, '*').replace(/%2D/g, '-'));  // legibilidad: * y - sin escapar
    });
    return parts.length ? '#' + parts.join('&') : '';
  }

  // href actual (con o sin hash previo) + params → URL compartible.
  function buildShareUrl(href, params) {
    const base = String(href || '').split('#')[0];
    return base + buildHash(params);
  }

  // Comparte con navigator.share si existe (móvil); si no, copia al
  // portapapeles. Devuelve Promise<'shared'|'copied'>; rechaza si nada funcionó.
  function shareOrCopy(url, title) {
    if (typeof navigator !== 'undefined' && navigator.share) {
      return navigator.share({ title: title || document.title, url })
        .then(() => 'shared')
        .catch(err => {
          if (err && err.name === 'AbortError') return 'shared';  // usuario canceló el sheet
          return copyToClipboard(url).then(() => 'copied');
        });
    }
    return copyToClipboard(url).then(() => 'copied');
  }

  function copyToClipboard(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    }
    return legacyCopy(text);
  }

  // Fallback para contextos sin Clipboard API (algunos file:// viejos).
  function legacyCopy(text) {
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (e) { reject(e); }
    });
  }

  G.urlState = {
    encodeProgression, decodeProgression,
    parseHash, buildHash, buildShareUrl,
    shareOrCopy, copyToClipboard,
  };

})(window.GuitarShared = window.GuitarShared || {});
