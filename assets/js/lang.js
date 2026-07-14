// Language switcher for MrMaper bilingual site (EN / FA)
(function () {
  'use strict';

  var STORAGE_KEY = 'mrmaper-lang';
  var DEFAULT_LANG = 'en';

  function getLang() {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (stored === 'en' || stored === 'fa') return stored;
    // Fallback to browser preference
    if (navigator.language && navigator.language.toLowerCase().indexOf('fa') === 0) return 'fa';
    return DEFAULT_LANG;
  }

  function applyLang(lang) {
    var root = document.documentElement;
    root.setAttribute('lang', lang);
    if (lang === 'fa') {
      root.classList.add('lang-fa');
      root.setAttribute('dir', 'rtl');
    } else {
      root.classList.remove('lang-fa');
      root.setAttribute('dir', 'ltr');
    }
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}

    // Swap texts tagged with data-i18n
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      var value = resolve(key, lang);
      if (value !== null) nodes[i].innerHTML = value;
    }

    // Update toggle button label
    var toggle = document.getElementById('lang-toggle');
    if (toggle) {
      toggle.textContent = (lang === 'fa') ? 'EN' : 'فا';
      toggle.setAttribute('aria-label', (lang === 'fa') ? 'Switch to English' : 'تغییر به فارسی');
    }
  }

  // Resolve a dotted key from site.data.i18n via a JSON blob injected by Jekyll
  var I18N = window.__I18N__ || {};
  function resolve(key, lang) {
    var dict = I18N[lang];
    if (!dict) return null;
    var parts = key.split('.');
    var cur = dict;
    for (var i = 0; i < parts.length; i++) {
      if (cur && typeof cur === 'object' && parts[i] in cur) cur = cur[parts[i]];
      else return null;
    }
    return (typeof cur === 'string') ? cur : null;
  }

  function toggle() {
    var current = getLang();
    applyLang(current === 'fa' ? 'en' : 'fa');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('lang-toggle');
    if (toggle) toggle.addEventListener('click', toggle);
    applyLang(getLang());
  });

  // Expose for manual use
  window.MrMaperLang = { get: getLang, set: applyLang, toggle: toggle };
})();