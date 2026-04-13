import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseField,
  parseCron,
  validateCron,
  describeCron,
  getNextFireTimes,
  SHORTCUTS,
} from '../src/cron.js';

// ---------------------------------------------------------------------------
// parseField
// ---------------------------------------------------------------------------

describe('parseField', () => {
  test('* returns all', () => {
    assert.deepEqual(parseField('*', 'minute'), { type: 'all' });
  });

  test('? returns all (alias)', () => {
    assert.deepEqual(parseField('?', 'dayOfMonth'), { type: 'all' });
  });

  test('*/15 returns step', () => {
    assert.deepEqual(parseField('*/15', 'minute'), { type: 'step', step: 15 });
  });

  test('*/1 returns step 1', () => {
    assert.deepEqual(parseField('*/1', 'hour'), { type: 'step', step: 1 });
  });

  test('plain value', () => {
    assert.deepEqual(parseField('30', 'minute'), { type: 'value', value: 30 });
  });

  test('list', () => {
    assert.deepEqual(parseField('1,3,5', 'dayOfWeek'), { type: 'list', values: [1, 3, 5] });
  });

  test('range', () => {
    assert.deepEqual(parseField('1-5', 'dayOfWeek'), { type: 'range', from: 1, to: 5 });
  });

  test('range with step', () => {
    assert.deepEqual(parseField('0-23/6', 'hour'), { type: 'rangeStep', from: 0, to: 23, step: 6 });
  });

  test('throws on out-of-range minute', () => {
    assert.throws(() => parseField('60', 'minute'), /out of range/);
  });

  test('throws on out-of-range hour', () => {
    assert.throws(() => parseField('24', 'hour'), /out of range/);
  });

  test('throws on invalid step', () => {
    assert.throws(() => parseField('*/0', 'minute'), /Invalid step/);
  });

  test('throws on non-numeric', () => {
    assert.throws(() => parseField('abc', 'minute'), /Non-numeric/);
  });

  test('throws on range with start >= end', () => {
    assert.throws(() => parseField('5-3', 'minute'), /must be less than/);
  });

  test('throws on unknown field type', () => {
    assert.throws(() => parseField('*', 'unknown'), /Unknown field type/);
  });
});

// ---------------------------------------------------------------------------
// parseCron
// ---------------------------------------------------------------------------

describe('parseCron', () => {
  test('parses 5-field expression', () => {
    const result = parseCron('*/15 * * * *');
    assert.deepEqual(result.minute, { type: 'step', step: 15 });
    assert.deepEqual(result.hour,   { type: 'all' });
  });

  test('parses @hourly shortcut', () => {
    const result = parseCron('@hourly');
    assert.deepEqual(result.minute, { type: 'value', value: 0 });
    assert.deepEqual(result.hour,   { type: 'all' });
  });

  test('parses @daily shortcut', () => {
    const result = parseCron('@daily');
    assert.deepEqual(result.minute, { type: 'value', value: 0 });
    assert.deepEqual(result.hour,   { type: 'value', value: 0 });
  });

  test('parses @weekly shortcut', () => {
    const result = parseCron('@weekly');
    assert.deepEqual(result.dayOfWeek, { type: 'value', value: 0 });
  });

  test('parses @monthly shortcut', () => {
    const result = parseCron('@monthly');
    assert.deepEqual(result.dayOfMonth, { type: 'value', value: 1 });
  });

  test('parses @yearly shortcut', () => {
    const result = parseCron('@yearly');
    assert.deepEqual(result.month, { type: 'value', value: 1 });
    assert.deepEqual(result.dayOfMonth, { type: 'value', value: 1 });
  });

  test('parses @reboot without throwing', () => {
    const result = parseCron('@reboot');
    assert.ok(result._reboot);
  });

  test('throws on wrong number of fields', () => {
    assert.throws(() => parseCron('* * * *'), /Expected 5 fields/);
  });

  test('throws on invalid field', () => {
    assert.throws(() => parseCron('60 * * * *'), /out of range/);
  });

  test('throws on non-string', () => {
    assert.throws(() => parseCron(123), /string/);
  });

  test('complex expression: 30 14 * * 1-5', () => {
    const result = parseCron('30 14 * * 1-5');
    assert.deepEqual(result.minute,    { type: 'value', value: 30 });
    assert.deepEqual(result.hour,      { type: 'value', value: 14 });
    assert.deepEqual(result.dayOfWeek, { type: 'range', from: 1, to: 5 });
  });

  test('complex expression: 0 9 * * 1,3,5', () => {
    const result = parseCron('0 9 * * 1,3,5');
    assert.deepEqual(result.minute, { type: 'value', value: 0 });
    assert.deepEqual(result.hour,   { type: 'value', value: 9 });
    assert.deepEqual(result.dayOfWeek, { type: 'list', values: [1, 3, 5] });
  });
});

// ---------------------------------------------------------------------------
// validateCron
// ---------------------------------------------------------------------------

describe('validateCron', () => {
  test('valid expression returns valid:true', () => {
    assert.deepEqual(validateCron('* * * * *'), { valid: true, errors: [] });
  });

  test('invalid expression returns valid:false with errors', () => {
    const r = validateCron('99 * * * *');
    assert.equal(r.valid, false);
    assert.ok(r.errors.length > 0);
  });

  test('@hourly is valid', () => {
    assert.equal(validateCron('@hourly').valid, true);
  });

  test('too few fields is invalid', () => {
    assert.equal(validateCron('* *').valid, false);
  });
});

// ---------------------------------------------------------------------------
// describeCron — English
// ---------------------------------------------------------------------------

describe('describeCron (en)', () => {
  test('every minute', () => {
    assert.equal(describeCron('* * * * *', 'en'), 'Every minute');
  });

  test('every 15 minutes', () => {
    assert.equal(describeCron('*/15 * * * *', 'en'), 'Every 15 minutes');
  });

  test('at start of every hour', () => {
    assert.match(describeCron('0 * * * *', 'en'), /:00/);
  });

  test('every day at midnight', () => {
    const d = describeCron('0 0 * * *', 'en');
    assert.match(d, /00:00/);
  });

  test('weekdays 14:30', () => {
    const d = describeCron('30 14 * * 1-5', 'en');
    assert.match(d, /14:30/);
    assert.match(d, /weekday/i);
  });

  test('mon wed fri 9:00', () => {
    const d = describeCron('0 9 * * 1,3,5', 'en');
    assert.match(d, /09:00/);
    assert.match(d, /Monday/);
  });

  test('1st of every month', () => {
    const d = describeCron('0 0 1 * *', 'en');
    assert.match(d, /1st/);
  });

  test('@hourly shortcut', () => {
    const d = describeCron('@hourly', 'en');
    assert.match(d, /:00/);
  });

  test('@daily shortcut', () => {
    const d = describeCron('@daily', 'en');
    assert.match(d, /00:00/);
  });

  test('@reboot shortcut', () => {
    assert.match(describeCron('@reboot', 'en'), /reboot/i);
  });

  test('every 5 minutes during business hours on weekdays', () => {
    const d = describeCron('*/5 9-17 * * 1-5', 'en');
    assert.match(d, /5 minute/);
    assert.match(d, /weekday/i);
  });
});

// ---------------------------------------------------------------------------
// describeCron — Japanese
// ---------------------------------------------------------------------------

describe('describeCron (ja)', () => {
  test('every minute', () => {
    assert.equal(describeCron('* * * * *', 'ja'), '毎分実行');
  });

  test('every 15 minutes', () => {
    assert.match(describeCron('*/15 * * * *', 'ja'), /15分ごと/);
  });

  test('every hour at :00', () => {
    assert.match(describeCron('0 * * * *', 'ja'), /毎時0分/);
  });

  test('weekdays', () => {
    assert.match(describeCron('30 14 * * 1-5', 'ja'), /平日/);
  });

  test('@reboot in ja', () => {
    assert.match(describeCron('@reboot', 'ja'), /起動/);
  });
});

// ---------------------------------------------------------------------------
// getNextFireTimes
// ---------------------------------------------------------------------------

describe('getNextFireTimes', () => {
  test('returns 5 dates for * * * * *', () => {
    const from = new Date('2025-01-01T00:00:00Z');
    const fires = getNextFireTimes('* * * * *', 5, from);
    assert.equal(fires.length, 5);
    // First fire should be 2025-01-01T00:01:00Z
    assert.equal(fires[0].toISOString(), '2025-01-01T00:01:00.000Z');
    // Each subsequent is 1 minute apart
    for (let i = 1; i < fires.length; i++) {
      assert.equal(fires[i] - fires[i-1], 60 * 1000);
    }
  });

  test('returns 5 dates for 0 * * * * (hourly)', () => {
    const from = new Date('2025-06-15T10:00:00Z');
    const fires = getNextFireTimes('0 * * * *', 5, from);
    assert.equal(fires.length, 5);
    // First should be at :00 of next hour
    assert.equal(fires[0].getMinutes(), 0);
    assert.equal(fires[1].getMinutes(), 0);
  });

  test('respects day-of-week filter', () => {
    // 0 9 * * 1 = every Monday at local 09:00
    const from = new Date('2025-01-06T00:00:00Z');
    const fires = getNextFireTimes('0 9 * * 1', 3, from);
    assert.equal(fires.length, 3);
    fires.forEach((d) => {
      assert.equal(d.getDay(), 1);       // Monday (local)
      assert.equal(d.getHours(), 9);     // 09:xx local
      assert.equal(d.getMinutes(), 0);
    });
  });

  test('returns empty array for @reboot', () => {
    assert.deepEqual(getNextFireTimes('@reboot', 5), []);
  });

  test('returns empty array for invalid expression', () => {
    assert.deepEqual(getNextFireTimes('bad expr', 5), []);
  });

  test('respects month filter', () => {
    // 0 0 1 6 * = every June 1st at local midnight
    const from = new Date('2025-01-01T00:00:00Z');
    const fires = getNextFireTimes('0 0 1 6 *', 2, from);
    assert.equal(fires.length, 2);
    fires.forEach((d) => {
      assert.equal(d.getMonth(), 5);  // June (0-indexed, local)
      assert.equal(d.getDate(), 1);
    });
  });

  test('@hourly returns hourly fires', () => {
    const from = new Date('2025-03-10T05:00:00Z');
    const fires = getNextFireTimes('@hourly', 3, from);
    assert.equal(fires.length, 3);
    fires.forEach((d) => {
      assert.equal(d.getUTCMinutes(), 0);
    });
  });
});

// ---------------------------------------------------------------------------
// SHORTCUTS
// ---------------------------------------------------------------------------

describe('SHORTCUTS', () => {
  test('contains @hourly, @daily, @weekly, @monthly, @yearly, @reboot', () => {
    assert.ok('@hourly'  in SHORTCUTS);
    assert.ok('@daily'   in SHORTCUTS);
    assert.ok('@weekly'  in SHORTCUTS);
    assert.ok('@monthly' in SHORTCUTS);
    assert.ok('@yearly'  in SHORTCUTS);
    assert.ok('@reboot'  in SHORTCUTS);
  });

  test('@hourly expands correctly', () => {
    assert.equal(SHORTCUTS['@hourly'], '0 * * * *');
  });
});
