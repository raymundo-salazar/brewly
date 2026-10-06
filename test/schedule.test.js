const test = require('node:test');
const assert = require('node:assert/strict');
const { isWithinSchedule } = require('../src/schedule');
const { parseDays } = require('../src/config');

const config = { startMinutes: 7 * 60, endMinutes: 17 * 60, days: [1, 3, 4, 5] };
const date = (day, hour) => new Date(Date.UTC(2026, 9, day, hour));

test('allows Monday and Wednesday through Friday from 07:00 inclusive', () => {
  for (const day of [5, 7, 8, 9]) assert.equal(isWithinSchedule(date(day, 7), config), true);
});

test('excludes Tuesday, weekends, and 17:00', () => {
  for (const day of [6, 10, 11]) assert.equal(isWithinSchedule(date(day, 10), config), false);
  assert.equal(isWithinSchedule(date(5, 17), config), false);
});

test('supports custom days and half-hour end times', () => {
  const custom = { startMinutes: 9 * 60, endMinutes: 17 * 60 + 30, days: [2, 6] };
  assert.equal(isWithinSchedule(date(6, 17), custom), true);
  assert.equal(isWithinSchedule(date(6, 17), { ...custom, endMinutes: 17 * 60 }), false);
  assert.equal(isWithinSchedule(date(10, 10), custom), true);
});

test('supports day group aliases', () => {
  assert.deepEqual(parseDays('all_week', []), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(parseDays('weekend', []), [0, 6]);
  assert.deepEqual(parseDays('working_days', []), [1, 2, 3, 4, 5]);
});
