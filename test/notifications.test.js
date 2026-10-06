const test = require('node:test');
const assert = require('node:assert/strict');
const { TITLE, createNotifier } = require('../src/notifications');

test('shows start and stop notifications', () => {
  const notifications = [];
  class FakeNotification {
    static isSupported() { return true; }
    constructor(options) { this.options = options; }
    show() { notifications.push(this.options); }
  }

  const notifier = createNotifier(FakeNotification, () => {}, { platform: 'linux' });
  notifier.started();
  notifier.stopped();

  assert.deepEqual(notifications, [
    { title: TITLE, body: 'El monitor de idle se ha iniciado.' },
    { title: TITLE, body: 'El monitor de idle se ha detenido.' },
  ]);
});
