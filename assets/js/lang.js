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

    // Convert Gregorian dates to Jalali (Shamsi) when Persian is active
    convertDates(lang);
  }

  // Elements with [data-date="YYYY-MM-DD"] get their text swapped to Jalali in FA mode.
  function convertDates(lang) {
    var J = window.JalaliDate;
    if (!J) return;
    var nodes = document.querySelectorAll('[data-date]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var iso = el.getAttribute('data-date');
      if (!el.__orig__) el.__orig__ = el.textContent;
      if (lang === 'fa') {
        var parts = (iso || '').split('-');
        if (parts.length >= 3) {
          var j = J.toJalali(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10),
            parseInt(parts[2], 10)
          );
          // Year-only entries (e.g. timeline "2017-01-01") map Gregorian year -> Jalali year (gYear - 621)
          if (parts[1] === '01' && parts[2] === '01') {
            el.textContent = J.toPersianDigits(parseInt(parts[0], 10) - 621);
          } else {
            el.textContent =
              J.toPersianDigits(j.d) + ' ' + J.months[j.m - 1] + ' ' + J.toPersianDigits(j.y);
          }
        }
      } else {
        el.textContent = el.__orig__;
      }
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

  function toggleFn() {
    var current = getLang();
    applyLang(current === 'fa' ? 'en' : 'fa');
  }

  function init() {
    var toggle = document.getElementById('lang-toggle');
    if (toggle) {
      toggle.addEventListener('click', toggleFn);
      // Ensure correct initial label even if applyLang ran early
      applyLang(getLang());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Script loaded after DOMContentLoaded (e.g. at end of body) — init now.
    init();
  }

  // Expose for manual use
  window.MrMaperLang = { get: getLang, set: applyLang, toggle: toggle };
})();