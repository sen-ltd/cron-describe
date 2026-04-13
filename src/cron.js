// cron.js — Cron expression parser, describer, validator, and next-fire calculator.
// Pure functions, DOM-free, zero dependencies.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FIELD_NAMES = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];

export const FIELD_RANGES = {
  minute:     { min: 0, max: 59 },
  hour:       { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month:      { min: 1, max: 12 },
  dayOfWeek:  { min: 0, max: 7 },  // 0 and 7 both = Sunday
};

export const SHORTCUTS = {
  '@yearly':   '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly':  '0 0 1 * *',
  '@weekly':   '0 0 * * 0',
  '@daily':    '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly':   '0 * * * *',
  '@reboot':   null,  // special – not calculable
};

const MONTH_NAMES_EN = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const MONTH_NAMES_JA = ['1月','2月','3月','4月','5月','6月',
  '7月','8月','9月','10月','11月','12月'];

const DOW_NAMES_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DOW_NAMES_JA = ['日曜日','月曜日','火曜日','水曜日','木曜日','金曜日','土曜日'];

const DOW_SHORT_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOW_SHORT_JA = ['日','月','火','水','木','金','土'];

// ---------------------------------------------------------------------------
// parseField
// ---------------------------------------------------------------------------

/**
 * Parse a single cron field string into a structured representation.
 * Returns one of:
 *   { type: 'all' }
 *   { type: 'step', step: n }                    — *\/n
 *   { type: 'value', value: n }
 *   { type: 'list', values: [n, ...] }
 *   { type: 'range', from: n, to: n }
 *   { type: 'rangeStep', from: n, to: n, step: n }
 * Throws a string error message on invalid input.
 *
 * @param {string} str  - field string
 * @param {string} type - field name for range validation
 */
export function parseField(str, type) {
  const range = FIELD_RANGES[type];
  if (!range) throw `Unknown field type: ${type}`;

  // '?' is treated same as '*' (common in some cron implementations)
  if (str === '*' || str === '?') return { type: 'all' };

  // */n — step over full range
  if (str.startsWith('*/')) {
    const step = parseInt(str.slice(2), 10);
    if (isNaN(step) || step < 1) throw `Invalid step in "${str}"`;
    return { type: 'step', step };
  }

  // comma-separated list
  if (str.includes(',')) {
    const parts = str.split(',');
    const values = parts.map((p) => {
      const n = parseInt(p, 10);
      if (isNaN(n)) throw `Non-numeric value "${p}" in list`;
      if (n < range.min || n > range.max) throw `Value ${n} out of range [${range.min}-${range.max}] in "${str}"`;
      return n;
    });
    if (values.length < 2) throw `List "${str}" has fewer than 2 elements`;
    return { type: 'list', values };
  }

  // range, possibly with step: n-m or n-m/s
  if (str.includes('-')) {
    const slashIdx = str.indexOf('/');
    const rangePart = slashIdx >= 0 ? str.slice(0, slashIdx) : str;
    const stepPart  = slashIdx >= 0 ? str.slice(slashIdx + 1) : null;
    const [fromStr, toStr] = rangePart.split('-');
    const from = parseInt(fromStr, 10);
    const to   = parseInt(toStr, 10);
    if (isNaN(from) || isNaN(to)) throw `Non-numeric range in "${str}"`;
    if (from < range.min || to > range.max) throw `Range ${from}-${to} out of bounds [${range.min}-${range.max}]`;
    if (from >= to) throw `Range start ${from} must be less than end ${to}`;
    if (stepPart !== null) {
      const step = parseInt(stepPart, 10);
      if (isNaN(step) || step < 1) throw `Invalid step in "${str}"`;
      return { type: 'rangeStep', from, to, step };
    }
    return { type: 'range', from, to };
  }

  // plain value
  const n = parseInt(str, 10);
  if (isNaN(n)) throw `Non-numeric value "${str}"`;
  if (n < range.min || n > range.max) throw `Value ${n} out of range [${range.min}-${range.max}]`;
  return { type: 'value', value: n };
}

// ---------------------------------------------------------------------------
// parseCron
// ---------------------------------------------------------------------------

/**
 * Parse a full cron expression (5-field or @shortcut) into its component fields.
 * Returns { minute, hour, dayOfMonth, month, dayOfWeek } where each value is
 * a parsed field object as returned by parseField.
 * Throws an Error on invalid input.
 *
 * @param {string} expression
 */
export function parseCron(expression) {
  if (typeof expression !== 'string') throw new Error('Expression must be a string');
  const expr = expression.trim();

  // Handle @reboot specially
  if (expr === '@reboot') {
    return {
      minute: { type: 'all' },
      hour: { type: 'all' },
      dayOfMonth: { type: 'all' },
      month: { type: 'all' },
      dayOfWeek: { type: 'all' },
      _reboot: true,
    };
  }

  // Expand shortcuts
  const expanded = SHORTCUTS[expr];
  if (expanded !== undefined) {
    if (expanded === null) throw new Error(`${expr} is a special shortcut that cannot be represented as 5-field cron`);
    return parseCron(expanded);
  }

  const parts = expr.split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Expected 5 fields, got ${parts.length}`);
  }

  const [minStr, hourStr, domStr, monStr, dowStr] = parts;
  try {
    return {
      minute:     parseField(minStr,  'minute'),
      hour:       parseField(hourStr, 'hour'),
      dayOfMonth: parseField(domStr,  'dayOfMonth'),
      month:      parseField(monStr,  'month'),
      dayOfWeek:  parseField(dowStr,  'dayOfWeek'),
    };
  } catch (msg) {
    throw new Error(msg);
  }
}

// ---------------------------------------------------------------------------
// validateCron
// ---------------------------------------------------------------------------

/**
 * Validate a cron expression. Returns { valid: boolean, errors: string[] }.
 *
 * @param {string} expression
 */
export function validateCron(expression) {
  try {
    parseCron(expression);
    return { valid: true, errors: [] };
  } catch (e) {
    return { valid: false, errors: [e.message] };
  }
}

// ---------------------------------------------------------------------------
// describeCron — natural-language description
// ---------------------------------------------------------------------------

/**
 * Generate a human-readable description of a cron expression.
 *
 * @param {string} expression
 * @param {'en'|'ja'} lang
 * @returns {string}
 */
export function describeCron(expression, lang = 'en') {
  const expr = expression.trim();

  // @reboot
  if (expr === '@reboot') {
    return lang === 'ja' ? '起動時に1回実行' : 'Once at system reboot';
  }

  // Expand shortcuts before describing
  const shortcutExpanded = SHORTCUTS[expr];
  if (shortcutExpanded !== undefined && shortcutExpanded !== null) {
    return describeCron(shortcutExpanded, lang);
  }

  const parsed = parseCron(expression);
  return _buildDescription(parsed, lang);
}

function _buildDescription(parsed, lang) {
  const ja = lang === 'ja';

  const { minute, hour, dayOfMonth, month, dayOfWeek } = parsed;

  // Shortcuts: all-star patterns
  if (_isAll(minute) && _isAll(hour) && _isAll(dayOfMonth) && _isAll(month) && _isAll(dayOfWeek)) {
    return ja ? '毎分実行' : 'Every minute';
  }

  // Build each phrase component
  const timePart   = _describeTime(minute, hour, lang);
  const domPart    = _describeDom(dayOfMonth, lang);
  const monthPart  = _describeMonth(month, lang);
  const dowPart    = _describeDow(dayOfWeek, lang);

  // Determine whether DOM or DOW takes precedence
  // Standard UNIX cron: if both are non-*, either can trigger (OR semantics)
  const domSet = !_isAll(dayOfMonth);
  const dowSet = !_isAll(dayOfWeek);

  if (ja) {
    return _assembleJa(timePart, domPart, monthPart, dowPart, domSet, dowSet);
  } else {
    return _assembleEn(timePart, domPart, monthPart, dowPart, domSet, dowSet);
  }
}

// ---- Time phrase ----

function _describeTime(minute, hour, lang) {
  const ja = lang === 'ja';

  if (_isAll(hour) && _isAll(minute)) return null; // "every minute" handled upstream

  // Every minute of specific hour(s)
  if (_isAll(minute)) {
    const h = _describeHour(hour, lang);
    return ja ? `${h}の毎分` : `every minute of ${h}`;
  }

  // Step over minutes — e.g. */15
  if (minute.type === 'step') {
    const s = minute.step;
    if (_isAll(hour)) {
      return ja ? `${s}分ごと` : `every ${s} minute${s !== 1 ? 's' : ''}`;
    }
    const h = _describeHour(hour, lang);
    return ja ? `${h}の${s}分ごと` : `every ${s} minute${s !== 1 ? 's' : ''} during ${h}`;
  }

  // Specific minute(s) of specific hour(s)
  const m = _describeMinute(minute, lang);
  if (_isAll(hour)) {
    return ja ? `毎時${m}` : `at ${m} past every hour`;
  }

  const h = _describeHour(hour, lang);
  if (ja) {
    return `${h}${m}`;
  } else {
    // For specific hours + specific minutes, format as HH:MM where possible
    if (hour.type === 'value' && minute.type === 'value') {
      return `at ${_pad(hour.value)}:${_pad(minute.value)}`;
    }
    return `at ${m} on ${h}`;
  }
}

function _describeMinute(minute, lang) {
  const ja = lang === 'ja';
  switch (minute.type) {
    case 'all':   return ja ? '毎分' : 'every minute';
    case 'value': return ja ? `${minute.value}分` : `:${_pad(minute.value)}`;
    case 'list':  return ja
      ? minute.values.map(v => `${v}分`).join('、')
      : minute.values.map(v => `:${_pad(v)}`).join(', ');
    case 'range': return ja
      ? `${minute.from}〜${minute.to}分`
      : `minutes ${minute.from}-${minute.to}`;
    case 'rangeStep': return ja
      ? `${minute.from}〜${minute.to}分を${minute.step}分間隔`
      : `every ${minute.step} minutes from ${minute.from} to ${minute.to}`;
    case 'step':  return ja ? `${minute.step}分ごと` : `every ${minute.step} minutes`;
    default:      return '';
  }
}

function _describeHour(hour, lang) {
  const ja = lang === 'ja';
  switch (hour.type) {
    case 'all':   return ja ? '毎時' : 'every hour';
    case 'value': return ja ? `${hour.value}時` : `${hour.value}:00`;
    case 'list':  return ja
      ? hour.values.map(v => `${v}時`).join('、')
      : _joinEnList(hour.values.map(v => `${_pad(v)}:00`));
    case 'range': return ja
      ? `${hour.from}〜${hour.to}時`
      : `${_pad(hour.from)}:00-${_pad(hour.to)}:00`;
    case 'rangeStep': return ja
      ? `${hour.from}〜${hour.to}時を${hour.step}時間間隔`
      : `every ${hour.step} hours from ${_pad(hour.from)}:00 to ${_pad(hour.to)}:00`;
    case 'step':  return ja ? `${hour.step}時間ごと` : `every ${hour.step} hours`;
    default:      return '';
  }
}

// ---- Day-of-month ----

function _describeDom(dom, lang) {
  const ja = lang === 'ja';
  switch (dom.type) {
    case 'all':   return null;
    case 'value': return ja ? `毎月${dom.value}日` : `the ${_ordinal(dom.value)}`;
    case 'list':  return ja
      ? dom.values.map(v => `${v}日`).join('、')
      : _joinEnList(dom.values.map(v => _ordinal(v)));
    case 'range': return ja
      ? `毎月${dom.from}〜${dom.to}日`
      : `days ${dom.from}-${dom.to}`;
    case 'rangeStep': return ja
      ? `毎月${dom.from}〜${dom.to}日を${dom.step}日おき`
      : `every ${dom.step} days from the ${_ordinal(dom.from)} to the ${_ordinal(dom.to)}`;
    case 'step':  return ja ? `${dom.step}日ごと` : `every ${dom.step} days`;
    default:      return null;
  }
}

// ---- Month ----

function _describeMonth(month, lang) {
  const ja = lang === 'ja';
  const names = ja ? MONTH_NAMES_JA : MONTH_NAMES_EN;
  switch (month.type) {
    case 'all':   return null;
    case 'value': return names[month.value - 1];
    case 'list':  return ja
      ? _joinEnList(month.values.map(v => names[v - 1]))
      : _joinEnList(month.values.map(v => names[v - 1]));
    case 'range': return ja
      ? `${names[month.from - 1]}〜${names[month.to - 1]}`
      : `${names[month.from - 1]} through ${names[month.to - 1]}`;
    case 'step':  return ja ? `${month.step}ヶ月ごと` : `every ${month.step} months`;
    case 'rangeStep': return ja
      ? `${names[month.from - 1]}〜${names[month.to - 1]}を${month.step}ヶ月おき`
      : `every ${month.step} months from ${names[month.from - 1]} to ${names[month.to - 1]}`;
    default:      return null;
  }
}

// ---- Day-of-week ----

function _describeDow(dow, lang) {
  const ja = lang === 'ja';
  const names = ja ? DOW_NAMES_JA : DOW_NAMES_EN;
  const shorts = ja ? DOW_SHORT_JA : DOW_SHORT_EN;
  // Normalize 7 → 0 (both mean Sunday)
  const norm = (v) => (v === 7 ? 0 : v);

  switch (dow.type) {
    case 'all':   return null;
    case 'value': return names[norm(dow.value)];
    case 'list': {
      const normalized = dow.values.map(norm);
      // Check if it's weekdays (1-5)
      if (normalized.length === 5 && [1,2,3,4,5].every(d => normalized.includes(d))) {
        return ja ? '平日' : 'weekdays';
      }
      // Check if it's weekends
      if (normalized.length === 2 && normalized.includes(0) && normalized.includes(6)) {
        return ja ? '週末' : 'weekends';
      }
      return ja
        ? _joinJaList(normalized.map(v => names[v]))
        : _joinEnList(normalized.map(v => names[v]));
    }
    case 'range': {
      const f = norm(dow.from);
      const t = norm(dow.to);
      // Weekdays shortcut: 1-5
      if (f === 1 && t === 5) return ja ? '平日' : 'weekdays';
      return ja
        ? `${shorts[f]}〜${shorts[t]}`
        : `${names[f]} through ${names[t]}`;
    }
    case 'rangeStep': return ja
      ? `${shorts[norm(dow.from)]}〜${shorts[norm(dow.to)]}を${dow.step}日おき`
      : `every ${dow.step} days from ${names[norm(dow.from)]} to ${names[norm(dow.to)]}`;
    case 'step':  return ja ? `${dow.step}日おき` : `every ${dow.step} days of the week`;
    default:      return null;
  }
}

// ---- Assembly ----

function _assembleEn(timePart, domPart, monthPart, dowPart, domSet, dowSet) {
  const parts = [];

  if (timePart) {
    parts.push(timePart.charAt(0).toUpperCase() + timePart.slice(1));
  } else {
    parts.push('Every minute');
  }

  // on [DOW / DOM]
  if (domSet && dowSet) {
    parts.push(`on ${domPart} or ${dowPart}`);
  } else if (domSet) {
    parts.push(`on ${domPart}`);
  } else if (dowSet) {
    parts.push(`on ${dowPart}`);
  }

  if (monthPart) {
    parts.push(`in ${monthPart}`);
  }

  return parts.join(', ');
}

function _assembleJa(timePart, domPart, monthPart, dowPart, domSet, dowSet) {
  let result = '';

  if (monthPart) result += `${monthPart}の`;
  if (domSet && dowSet) {
    result += `${domPart}または${dowPart}の`;
  } else if (domSet) {
    result += `${domPart}の`;
  } else if (dowSet) {
    result += `${dowPart}の`;
  }

  result += timePart || '毎分';

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _isAll(field) {
  return field && field.type === 'all';
}

function _pad(n) {
  return String(n).padStart(2, '0');
}

function _ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function _joinEnList(arr) {
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}

function _joinJaList(arr) {
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  return arr.slice(0, -1).join('、') + 'と' + arr[arr.length - 1];
}

// ---------------------------------------------------------------------------
// getNextFireTimes
// ---------------------------------------------------------------------------

/**
 * Calculate the next `count` fire times after `from`.
 * Returns an array of Date objects (length = count).
 * Returns empty array for @reboot or if expression is invalid.
 *
 * @param {string} expression
 * @param {number} count - how many fire times to return
 * @param {Date}   from  - start point (exclusive), defaults to now
 */
export function getNextFireTimes(expression, count = 5, from = new Date()) {
  if (expression.trim() === '@reboot') return [];

  let parsed;
  try {
    parsed = parseCron(expression);
  } catch {
    return [];
  }

  const results = [];
  // Start from the next minute after `from`
  const cursor = new Date(from);
  cursor.setSeconds(0);
  cursor.setMilliseconds(0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const limit = count * 366 * 24 * 60; // safeguard: max iterations
  let iterations = 0;

  while (results.length < count && iterations < limit) {
    iterations++;
    if (_matches(parsed, cursor)) {
      results.push(new Date(cursor));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return results;
}

/**
 * Check if a Date matches the parsed cron expression.
 */
function _matches(parsed, date) {
  const min = date.getMinutes();
  const hr  = date.getHours();
  const dom = date.getDate();
  const mon = date.getMonth() + 1; // 1-12
  const dow = date.getDay();       // 0=Sun

  if (!_fieldMatches(parsed.minute, min, 'minute')) return false;
  if (!_fieldMatches(parsed.hour, hr, 'hour')) return false;
  if (!_fieldMatches(parsed.month, mon, 'month')) return false;

  // Standard UNIX cron: if BOTH dom and dow are restricted, use OR semantics
  const domAll = _isAll(parsed.dayOfMonth);
  const dowAll = _isAll(parsed.dayOfWeek);

  if (domAll && dowAll) return true;
  if (domAll) return _fieldMatchesDow(parsed.dayOfWeek, dow);
  if (dowAll) return _fieldMatches(parsed.dayOfMonth, dom, 'dayOfMonth');
  // Both restricted: OR
  return _fieldMatches(parsed.dayOfMonth, dom, 'dayOfMonth') ||
         _fieldMatchesDow(parsed.dayOfWeek, dow);
}

function _fieldMatchesDow(field, dow) {
  // Normalize 7 → 0
  const norm = (v) => (v === 7 ? 0 : v);
  switch (field.type) {
    case 'all':       return true;
    case 'value':     return norm(field.value) === dow;
    case 'list':      return field.values.map(norm).includes(dow);
    case 'range':     return dow >= norm(field.from) && dow <= norm(field.to);
    case 'rangeStep': {
      const f = norm(field.from);
      const t = norm(field.to);
      if (dow < f || dow > t) return false;
      return (dow - f) % field.step === 0;
    }
    case 'step':      return dow % field.step === 0;
    default:          return false;
  }
}

function _fieldMatches(field, value, type) {
  const range = FIELD_RANGES[type];
  switch (field.type) {
    case 'all':       return true;
    case 'value':     return field.value === value;
    case 'list':      return field.values.includes(value);
    case 'range':     return value >= field.from && value <= field.to;
    case 'rangeStep': {
      if (value < field.from || value > field.to) return false;
      return (value - field.from) % field.step === 0;
    }
    case 'step':      return (value - range.min) % field.step === 0;
    default:          return false;
  }
}
