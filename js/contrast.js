/**
 * Moteur pur de calcul de contraste WCAG 2.1 / RGAA 4.
 * Sans dépendance DOM : facilement testable unitairement.
 */
(function (global) {
  'use strict';

  /**
   * Normalise un code hexadécimal (#RGB ou #RRGGBB, avec ou sans #).
   * Retourne null si invalide.
   * @param {string} value
   * @returns {string|null}
   */
  function normalizeHex(value) {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
      return (
        '#' +
        cleaned
          .split('')
          .map((ch) => ch + ch)
          .join('')
          .toLowerCase()
      );
    }
    if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
      return '#' + cleaned.toLowerCase();
    }
    return null;
  }

  /**
   * Convertit un code #rrggbb valide en objet { r, g, b }.
   * @param {string} hex
   * @returns {{ r: number, g: number, b: number }|null}
   */
  function hexToRgb(hex) {
    const normalized = normalizeHex(hex);
    if (!normalized) return null;
    const intVal = parseInt(normalized.slice(1), 16);
    return {
      r: (intVal >> 16) & 255,
      g: (intVal >> 8) & 255,
      b: intVal & 255
    };
  }

  /**
   * Convertit { r, g, b } en #rrggbb.
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {string}
   */
  function rgbToHex(r, g, b) {
    const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Calcule la luminance relative selon WCAG 2.1 (seuil 0.04045).
   * @param {{ r: number, g: number, b: number }} rgb
   * @returns {number}
   */
  function getRelativeLuminance({ r, g, b }) {
    const linearize = (channel) => {
      const srgb = channel / 255;
      return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  }

  /**
   * Calcule le ratio de contraste entre deux couleurs hexadécimales.
   * @param {string} fgHex
   * @param {string} bgHex
   * @returns {number|null}
   */
  function getContrastRatio(fgHex, bgHex) {
    const fgRgb = hexToRgb(fgHex);
    const bgRgb = hexToRgb(bgHex);
    if (!fgRgb || !bgRgb) return null;

    const l1 = getRelativeLuminance(fgRgb);
    const l2 = getRelativeLuminance(bgRgb);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  function rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
      else if (max === gn) h = (bn - rn) / d + 2;
      else h = (rn - gn) / d + 4;
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToHex(h, s, l) {
    const hn = (((h % 360) + 360) % 360) / 360;
    const sn = Math.max(0, Math.min(100, s)) / 100;
    const ln = Math.max(0, Math.min(100, l)) / 100;

    if (sn === 0) {
      const gray = ln * 255;
      return rgbToHex(gray, gray, gray);
    }

    const hue2rgb = (p, q, t) => {
      let tn = t;
      if (tn < 0) tn += 1;
      if (tn > 1) tn -= 1;
      if (tn < 1 / 6) return p + (q - p) * 6 * tn;
      if (tn < 1 / 2) return q;
      if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
      return p;
    };

    const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
    const p = 2 * ln - q;

    return rgbToHex(
      hue2rgb(p, q, hn + 1 / 3) * 255,
      hue2rgb(p, q, hn) * 255,
      hue2rgb(p, q, hn - 1 / 3) * 255
    );
  }

  /**
   * Propose la couleur de premier plan la plus proche (en luminosité HSL)
   * atteignant le ratio cible (4.5:1 par défaut). Retourne null si déjà conforme.
   * @param {string} fgHex
   * @param {string} bgHex
   * @param {number} [targetRatio=4.5]
   * @returns {{ hex: string, ratio: number }|null}
   */
  function suggestCompliantForeground(fgHex, bgHex, targetRatio = 4.5) {
    const currentRatio = getContrastRatio(fgHex, bgHex);
    if (currentRatio === null || currentRatio >= targetRatio) return null;

    const fgRgb = hexToRgb(fgHex);
    const { h, s, l } = rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);
    const candidates = [];

    // Recherche en assombrissant (vers L = 0)
    if (getContrastRatio('#000000', bgHex) >= targetRatio) {
      let low = 0;
      let high = l;
      let bestHex = '#000000';
      let bestL = 0;

      for (let i = 0; i < 20; i++) {
        const mid = (low + high) / 2;
        const candidate = hslToHex(h, s, mid);
        if (getContrastRatio(candidate, bgHex) >= targetRatio) {
          bestHex = candidate;
          bestL = mid;
          low = mid;
        } else {
          high = mid;
        }
      }
      candidates.push({ hex: bestHex, dist: Math.abs(l - bestL) });
    }

    // Recherche en éclaircissant (vers L = 100)
    if (getContrastRatio('#ffffff', bgHex) >= targetRatio) {
      let low = l;
      let high = 100;
      let bestHex = '#ffffff';
      let bestL = 100;

      for (let i = 0; i < 20; i++) {
        const mid = (low + high) / 2;
        const candidate = hslToHex(h, s, mid);
        if (getContrastRatio(candidate, bgHex) >= targetRatio) {
          bestHex = candidate;
          bestL = mid;
          high = mid;
        } else {
          low = mid;
        }
      }
      candidates.push({ hex: bestHex, dist: Math.abs(bestL - l) });
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.dist - b.dist);
    const chosenHex = candidates[0].hex;

    return {
      hex: chosenHex,
      ratio: getContrastRatio(chosenHex, bgHex)
    };
  }

  global.ContrastEngine = {
    normalizeHex,
    getContrastRatio,
    suggestCompliantForeground
  };
})(window);