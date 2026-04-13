// main.js — DOM management and event wiring for cron-describe.
// Imports cron.js and i18n.js; runs in the browser as an ES module.

import { describeCron, validateCron, getNextFireTimes } from './cron.js';
import { t, EXAMPLES } from './i18n.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentLang  = localStorage.getItem('cd-lang')  || 'ja';
let currentTheme = localStorage.getItem('cd-theme') || 'dark';

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const inputEl        = document.getElementById('cron-input');
const clearBtn       = document.getElementById('clear-btn');
const copyBtn        = document.getElementById('copy-btn');
const descEnEl       = document.getElementById('desc-en');
const descJaEl       = document.getElementById('desc-ja');
const descEnLabel    = document.getElementById('desc-en-label');
const descJaLabel    = document.getElementById('desc-ja-label');
const errorsEl       = document.getElementById('errors');
const errTitleEl     = document.getElementById('err-title');
const firePanelEl    = document.getElementById('fire-times-panel');
const fireListEl     = document.getElementById('fire-times-list');
const fireLabel      = document.getElementById('fire-times-label');
const examplesTable  = document.getElementById('examples-table');
const examplesLabel  = document.getElementById('examples-label');
const examplesColEx  = document.getElementById('col-expression');
const examplesColDes = document.getElementById('col-description');
const langBtns       = document.querySelectorAll('.lang-btn');
const themeBtns      = document.querySelectorAll('.theme-btn');
const footerEl       = document.getElementById('footer-text');
const titleEl        = document.getElementById('title');
const subtitleEl     = document.getElementById('subtitle');
const inputLabel     = document.getElementById('input-label');

// ---------------------------------------------------------------------------
// Language and theme
// ---------------------------------------------------------------------------

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('cd-lang', lang);
  document.documentElement.lang = lang;

  // Static UI labels
  titleEl.textContent         = t(lang, 'title');
  subtitleEl.textContent      = t(lang, 'subtitle');
  inputLabel.textContent      = t(lang, 'labelExpression');
  inputEl.placeholder         = t(lang, 'placeholder');
  clearBtn.textContent        = t(lang, 'clearBtn');
  copyBtn.textContent         = t(lang, 'copyBtn');
  descEnLabel.textContent     = t(lang, 'labelDescriptionEn');
  descJaLabel.textContent     = t(lang, 'labelDescriptionJa');
  fireLabel.textContent       = t(lang, 'labelNextFires');
  errTitleEl.textContent      = t(lang, 'errorTitle');
  examplesLabel.textContent   = t(lang, 'labelExamples');
  examplesColEx.textContent   = t(lang, 'colExpression');
  examplesColDes.textContent  = t(lang, 'colDescription');
  footerEl.textContent        = t(lang, 'footer');
  document.getElementById('sibling-builder').textContent = t(lang, 'siblingCronBuilder');
  document.getElementById('sibling-tz').textContent      = t(lang, 'siblingCronTz');

  // Active state
  langBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.lang === lang));

  // Re-render examples table in current lang
  renderExamples();

  // Re-evaluate current input
  evaluate();
}

function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('cd-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  themeBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.theme === theme));
}

// ---------------------------------------------------------------------------
// Evaluate expression
// ---------------------------------------------------------------------------

function evaluate() {
  const raw = inputEl.value.trim();

  if (!raw) {
    descEnEl.textContent = '';
    descJaEl.textContent = '';
    errorsEl.hidden      = true;
    firePanelEl.hidden   = true;
    return;
  }

  const { valid, errors } = validateCron(raw);

  if (!valid) {
    errorsEl.hidden    = false;
    firePanelEl.hidden = true;
    document.getElementById('err-list').innerHTML =
      errors.map((e) => `<li>${_esc(e)}</li>`).join('');
    descEnEl.textContent = '';
    descJaEl.textContent = '';
    return;
  }

  errorsEl.hidden = true;

  // Descriptions
  descEnEl.textContent = describeCron(raw, 'en');
  descJaEl.textContent = describeCron(raw, 'ja');

  // Next fire times
  if (raw === '@reboot') {
    firePanelEl.hidden = false;
    fireListEl.innerHTML = `<li class="muted">${_esc(t(currentLang, 'rebootNote'))}</li>`;
    return;
  }

  const fires = getNextFireTimes(raw, 5);
  firePanelEl.hidden = false;
  fireListEl.innerHTML = fires.map((d) => `<li>${_formatDate(d, currentLang)}</li>`).join('');
}

// ---------------------------------------------------------------------------
// Examples table
// ---------------------------------------------------------------------------

function renderExamples() {
  const tbody = examplesTable.querySelector('tbody');
  tbody.innerHTML = EXAMPLES.map(({ expr, en, ja }) => `
    <tr class="example-row" data-expr="${_esc(expr)}" tabindex="0" role="button"
        aria-label="${_esc(expr)}">
      <td><code>${_esc(expr)}</code></td>
      <td>${_esc(currentLang === 'ja' ? ja : en)}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.example-row').forEach((row) => {
    row.addEventListener('click',   () => useExample(row.dataset.expr));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); useExample(row.dataset.expr); }
    });
  });
}

function useExample(expr) {
  inputEl.value = expr;
  inputEl.focus();
  evaluate();
  // Scroll input into view on mobile
  inputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function _formatDate(date, lang) {
  const opts = {
    year:   'numeric',
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  };
  const locale = lang === 'ja' ? 'ja-JP' : 'en-US';
  return new Intl.DateTimeFormat(locale, opts).format(date);
}

function _esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

inputEl.addEventListener('input', evaluate);

clearBtn.addEventListener('click', () => {
  inputEl.value = '';
  inputEl.focus();
  evaluate();
});

copyBtn.addEventListener('click', () => {
  const raw = inputEl.value.trim();
  if (!raw) return;
  navigator.clipboard.writeText(raw).then(() => {
    copyBtn.textContent = t(currentLang, 'copiedBtn');
    setTimeout(() => { copyBtn.textContent = t(currentLang, 'copyBtn'); }, 1500);
  });
});

langBtns.forEach((btn) => {
  btn.addEventListener('click', () => applyLang(btn.dataset.lang));
});

themeBtns.forEach((btn) => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

applyTheme(currentTheme);
applyLang(currentLang);

// Load URL query param ?expr=...
const urlExpr = new URLSearchParams(location.search).get('expr');
if (urlExpr) {
  inputEl.value = urlExpr;
  evaluate();
}
