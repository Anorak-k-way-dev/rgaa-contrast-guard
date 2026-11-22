/**
 * Contrôleur UI accessible pour RGAA Contrast Guard.
 */
(function () {
  'use strict';

  const { normalizeHex, getContrastRatio, suggestCompliantForeground } = window.ContrastEngine;

  const els = {
    fgPicker: document.getElementById('fg-picker'),
    fgHex: document.getElementById('fg-hex'),
    fgError: document.getElementById('fg-error'),
    bgPicker: document.getElementById('bg-picker'),
    bgHex: document.getElementById('bg-hex'),
    bgError: document.getElementById('bg-error'),
    swapBtn: document.getElementById('swap-colors'),
    ratioValue: document.getElementById('ratio-value'),
    previewBox: document.getElementById('preview-box'),
    suggestionBox: document.getElementById('suggestion-box'),
    suggestionText: document.getElementById('suggestion-text'),
    applySuggestionBtn: document.getElementById('apply-suggestion'),
    srStatus: document.getElementById('sr-status'),
    presetBtns: document.querySelectorAll('.preset-btn'),
    criteria: {
      normalAA: document.getElementById('crit-normal-aa'),
      normalAAA: document.getElementById('crit-normal-aaa'),
      largeAA: document.getElementById('crit-large-aa'),
      uiAA: document.getElementById('crit-ui-aa')
    }
  };

  let state = {
    fg: '#1d4ed8',
    bg: '#ffffff',
    suggestedFg: null
  };

  let srDebounceTimer = null;

  function setErrorState(inputEl, errorEl, hasError) {
    inputEl.setAttribute('aria-invalid', String(hasError));
    errorEl.hidden = !hasError;
  }

  function updateCriteriaItem(itemEl, isPass) {
    itemEl.classList.toggle('is-pass', isPass);
    itemEl.classList.toggle('is-fail', !isPass);
    const badge = itemEl.querySelector('[data-badge]');
    badge.textContent = isPass ? 'Conforme' : 'Non conforme';
  }

 function announceToScreenReader(ratio, passNormalAA) {
    window.clearTimeout(srDebounceTimer);
    srDebounceTimer = window.setTimeout(() => {
      const formattedRatio = ratio.toFixed(2).replace('.', ',');
      const verdict = passNormalAA
        ? 'Conforme RGAA niveau AA pour le texte normal.'
        : 'Non conforme au niveau AA pour le texte normal.';
      els.srStatus.textContent = `Ratio de contraste : ${formattedRatio} pour 1. ${verdict}`;
    }, 450);
  }

  function render(shouldAnnounce = true) {
    const ratio = getContrastRatio(state.fg, state.bg);
    if (ratio === null) return;

    // Mise à jour de l'aperçu via 2 CSS custom properties
    els.previewBox.style.setProperty('--preview-fg', state.fg);
    els.previewBox.style.setProperty('--preview-bg', state.bg);

    els.ratioValue.textContent = `${ratio.toFixed(2)} : 1`;

    const passNormalAA = ratio >= 4.5;
    updateCriteriaItem(els.criteria.normalAA, passNormalAA);
    updateCriteriaItem(els.criteria.normalAAA, ratio >= 7);
    updateCriteriaItem(els.criteria.largeAA, ratio >= 3);
    updateCriteriaItem(els.criteria.uiAA, ratio >= 3);

    // Proposition de teinte conforme AA si échec (tuile toujours visible = 0 saut de layout)
    const suggestion = suggestCompliantForeground(state.fg, state.bg, 4.5);
    if (suggestion) {
      state.suggestedFg = suggestion.hex;
      els.suggestionText.textContent = `Teinte la plus proche conforme AA : ${suggestion.hex} (${suggestion.ratio.toFixed(2)} : 1).`;
      els.applySuggestionBtn.hidden = false;
      els.suggestionBox.classList.add('needs-fix');
    } else {
      state.suggestedFg = null;
      els.suggestionText.textContent = 'Aucune correction requise : contraste conforme au seuil AA (≥ 4.5 : 1).';
      els.applySuggestionBtn.hidden = true;
      els.suggestionBox.classList.remove('needs-fix');
    }

    if (shouldAnnounce) {
      announceToScreenReader(ratio, passNormalAA);
    }
  }

  function setColors(fg, bg, shouldAnnounce = true) {
    const normFg = normalizeHex(fg);
    const normBg = normalizeHex(bg);
    if (normFg) {
      state.fg = normFg;
      els.fgPicker.value = normFg;
      els.fgHex.value = normFg;
      setErrorState(els.fgHex, els.fgError, false);
    }
    if (normBg) {
      state.bg = normBg;
      els.bgPicker.value = normBg;
      els.bgHex.value = normBg;
      setErrorState(els.bgHex, els.bgError, false);
    }
    render(shouldAnnounce);
  }

  // Synchronisation Color Picker -> Hex Input
  els.fgPicker.addEventListener('input', (e) => {
    setColors(e.target.value, state.bg);
  });

  els.bgPicker.addEventListener('input', (e) => {
    setColors(state.fg, e.target.value);
  });

  // Synchronisation Hex Input -> Color Picker
  els.fgHex.addEventListener('input', (e) => {
    const norm = normalizeHex(e.target.value);
    if (norm) {
      state.fg = norm;
      els.fgPicker.value = norm;
      setErrorState(els.fgHex, els.fgError, false);
      render();
    }
  });

  els.bgHex.addEventListener('input', (e) => {
    const norm = normalizeHex(e.target.value);
    if (norm) {
      state.bg = norm;
      els.bgPicker.value = norm;
      setErrorState(els.bgHex, els.bgError, false);
      render();
    }
  });

  // Validation non bloquante au blur
  els.fgHex.addEventListener('blur', (e) => {
    const norm = normalizeHex(e.target.value);
    if (norm) {
      e.target.value = norm;
      setErrorState(els.fgHex, els.fgError, false);
    } else {
      setErrorState(els.fgHex, els.fgError, true);
    }
  });

  els.bgHex.addEventListener('blur', (e) => {
    const norm = normalizeHex(e.target.value);
    if (norm) {
      e.target.value = norm;
      setErrorState(els.bgHex, els.bgError, false);
    } else {
      setErrorState(els.bgHex, els.bgError, true);
    }
  });

  // Inversion des couleurs
  els.swapBtn.addEventListener('click', () => {
    setColors(state.bg, state.fg);
  });

  // Application de la teinte suggérée + gestion propre du focus
  els.applySuggestionBtn.addEventListener('click', () => {
    if (!state.suggestedFg) return;
    setColors(state.suggestedFg, state.bg);
    // Le bouton va disparaître (hidden = true) : on replace le focus sur le champ texte modifié
    els.fgHex.focus();
  });

  // Exemples rapides
  els.presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setColors(btn.dataset.fg, btn.dataset.bg);
    });
  });

  // Rendu initial silencieux (ne pas déclencher aria-live au chargement)
  render(false);
})();