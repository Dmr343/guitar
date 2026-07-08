// Tests de export-image — solo las partes puras (buildSvg/PNG usan
// DOM/canvas y se verifican en navegador).
(function (G) {
  const T = G.testRunner;
  const EI = G.exportImage;

  T.describe('exportImage.parseViewBox', () => {
    T.it('parsea "x y w h"', () => {
      const vb = EI.parseViewBox('0 0 920 220');
      T.assertEq(vb.x, 0);
      T.assertEq(vb.w, 920);
      T.assertEq(vb.h, 220);
    });
    T.it('acepta comas y offsets negativos', () => {
      const vb = EI.parseViewBox('-10, 5, 100, 50');
      T.assertEq(vb.x, -10);
      T.assertEq(vb.y, 5);
    });
    T.it('inválidos → null', () => {
      T.assertEq(EI.parseViewBox(''), null);
      T.assertEq(EI.parseViewBox(null), null);
      T.assertEq(EI.parseViewBox('0 0 920'), null);
      T.assertEq(EI.parseViewBox('0 0 0 220'), null);
      T.assertEq(EI.parseViewBox('a b c d'), null);
    });
  });

  T.describe('exportImage.computeLayout', () => {
    const vb = { x: 0, y: 0, w: 920, h: 220 };
    T.it('sin marca de agua no agrega franja', () => {
      const l = EI.computeLayout(vb, {});
      T.assertEq(l.height, 220);
      T.assertEq(l.viewBox, '0 0 920 220');
    });
    T.it('con marca de agua extiende la altura', () => {
      const l = EI.computeLayout(vb, { watermark: 'x' });
      T.assertEq(l.height, 220 + EI.WATERMARK_BAND);
      T.assertEq(l.viewBox, '0 0 920 ' + (220 + EI.WATERMARK_BAND));
    });
    T.it('la marca queda abajo a la derecha', () => {
      const l = EI.computeLayout(vb, { watermark: 'x' });
      T.assertEq(l.watermarkX, 920 - 8);
      T.assertEq(l.watermarkY, 220 + EI.WATERMARK_BAND - 8);
    });
    T.it('respeta offsets del viewBox', () => {
      const l = EI.computeLayout({ x: 10, y: 20, w: 100, h: 50 }, { watermark: 'x' });
      T.assertEq(l.viewBox, '10 20 100 ' + (50 + EI.WATERMARK_BAND));
      T.assertEq(l.watermarkX, 10 + 100 - 8);
    });
  });

  T.describe('exportImage.slugify', () => {
    T.it('slug seguro con acentos, glifos y espacios', () => {
      T.assertEq(EI.slugify('Atlas — Dm7 · G7 · CΔ'), 'atlas-dm7-g7-c');
      T.assertEq(EI.slugify('Ámbar Ñu'), 'ambar-nu');
    });
    T.it('vacío → cadena vacía', () => {
      T.assertEq(EI.slugify(''), '');
      T.assertEq(EI.slugify(null), '');
    });
  });

})(window.GuitarShared);
