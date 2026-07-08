// export-image.js — exportar un diagrama SVG (el mástil) a imagen.
// Plain script, file:// safe. Se cuelga de window.GuitarShared.exportImage.
//
// Serializa el <svg> vivo con un fondo sólido y una marca de agua
// ("harmonic.dadiabatic.com") en una franja extra abajo, y lo baja
// como .svg limpio o lo rasteriza a .png vía canvas (sin red: el SVG
// viaja como data: URL, así el canvas no queda contaminado).
(function (G) {

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const WATERMARK_BAND = 24;   // franja extra (px de viewBox) para la marca

  // 'x y w h' → { x, y, w, h } o null si no parsea.
  function parseViewBox(str) {
    if (!str || typeof str !== 'string') return null;
    const p = str.trim().split(/[\s,]+/).map(Number);
    if (p.length !== 4 || p.some(n => !Number.isFinite(n)) || p[2] <= 0 || p[3] <= 0) {
      return null;
    }
    return { x: p[0], y: p[1], w: p[2], h: p[3] };
  }

  // computeLayout — geometría del export: viewBox extendido para la
  // franja de la marca de agua y posición del texto (abajo a la derecha).
  function computeLayout(vb, opts) {
    opts = opts || {};
    const band = opts.watermark ? WATERMARK_BAND : 0;
    return {
      viewBox: vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + (vb.h + band),
      width: vb.w,
      height: vb.h + band,
      watermarkX: vb.x + vb.w - 8,
      watermarkY: vb.y + vb.h + band - 8,
    };
  }

  // Nombre de archivo seguro a partir de un nombre libre.
  function slugify(name) {
    return String(name || '').trim().toLowerCase()
      .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
      .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // buildSvg — clona el SVG vivo y devuelve { str, width, height }.
  // opts: { background: '#141210', watermark: 'texto', watermarkColor }
  function buildSvg(svgEl, opts) {
    opts = opts || {};
    const vb = parseViewBox(svgEl.getAttribute('viewBox')) ||
      { x: 0, y: 0, w: svgEl.clientWidth || 900, h: svgEl.clientHeight || 220 };
    const layout = computeLayout(vb, opts);

    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', SVG_NS);
    clone.setAttribute('viewBox', layout.viewBox);
    clone.setAttribute('width', layout.width);
    clone.setAttribute('height', layout.height);
    clone.removeAttribute('id');
    clone.removeAttribute('style');

    // Fondo sólido (el SVG vivo es transparente sobre la página oscura).
    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('x', vb.x);
    bg.setAttribute('y', vb.y);
    bg.setAttribute('width', layout.width);
    bg.setAttribute('height', layout.height);
    bg.setAttribute('fill', opts.background || '#141210');
    clone.insertBefore(bg, clone.firstChild);

    if (opts.watermark) {
      const wm = document.createElementNS(SVG_NS, 'text');
      wm.setAttribute('x', layout.watermarkX);
      wm.setAttribute('y', layout.watermarkY);
      wm.setAttribute('text-anchor', 'end');
      wm.setAttribute('font-family', 'monospace');
      wm.setAttribute('font-size', '11');
      wm.setAttribute('fill', opts.watermarkColor || '#8a7a5a');
      wm.textContent = opts.watermark;
      clone.appendChild(wm);
    }

    return {
      str: new XMLSerializer().serializeToString(clone),
      width: layout.width,
      height: layout.height,
    };
  }

  // svgToPngBlob — rasteriza a PNG. opts.scale (default 2) multiplica
  // la resolución (retina / impresión). Devuelve Promise<Blob>.
  function svgToPngBlob(svgEl, opts) {
    opts = opts || {};
    const built = buildSvg(svgEl, opts);
    const scale = Number(opts.scale) > 0 ? Number(opts.scale) : 2;
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(built.width * scale);
          canvas.height = Math.round(built.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function (blob) {
            blob ? resolve(blob) : reject(new Error('canvas.toBlob devolvió null'));
          }, 'image/png');
        } catch (e) { reject(e); }
      };
      img.onerror = function () { reject(new Error('no se pudo rasterizar el SVG')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(built.str);
    });
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // downloadPng / downloadSvg — export directo con nombre slug-eado.
  function downloadPng(svgEl, name, opts) {
    return svgToPngBlob(svgEl, opts).then(function (blob) {
      downloadBlob((slugify(name) || 'diagrama') + '.png', blob);
    });
  }
  function downloadSvg(svgEl, name, opts) {
    const built = buildSvg(svgEl, opts);
    downloadBlob((slugify(name) || 'diagrama') + '.svg',
      new Blob([built.str], { type: 'image/svg+xml' }));
    return Promise.resolve();
  }

  G.exportImage = {
    parseViewBox, computeLayout, slugify, buildSvg,
    svgToPngBlob, downloadPng, downloadSvg,
    WATERMARK_BAND,
  };

})(window.GuitarShared = window.GuitarShared || {});
