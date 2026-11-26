"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const source = fs.readFileSync("notifications.js", "utf8");

function setup() {
  const state = {
    user: "a", calls: [], shown: [], listeners: {},
    row: { latest_message: null, latest_practice: null, practice_created_at: null, observed_at: "2030-01-01T10:00:00Z" }
  };
  const elements = Object.fromEntries(["#notification-toggle", "#notification-status"].map(id => [id, {
    disabled: false, textContent: "", classList: { toggle() {} },
    addEventListener(type, handler) { this[type] = handler; }
  }]));
  class Notification {
    static permission = "granted";
    static async requestPermission() { return this.permission; }
  }
  const window = {
    isSecureContext: true, Notification,
    PingCloud: { getUserId: () => state.user, client: { async rpc(name) { state.calls.push(name); return { data: [state.row], error: null }; } } },
    addEventListener(type, handler) { state.listeners[type] = handler; }
  };
  const navigator = { serviceWorker: {
    async getRegistration() { return { async showNotification(title, options) { state.shown.push({ title, ...options }); } }; },
    addEventListener() {}
  } };
  vm.runInNewContext(source, {
    window, Notification, navigator, document: { querySelector: id => elements[id] },
    location: { hash: "" }, setInterval(fn) { state.poll = fn; }, BigInt
  });
  return { state, elements, Notification };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("les nouvelles alertes après activation sont notifiées sans afficher le contenu privé", async () => {
  const t = setup();
  await t.elements["#notification-toggle"].click();
  t.state.row = { latest_message: "90071992547409930", latest_practice: "b", practice_created_at: "2030-01-01T10:01:00Z", observed_at: "2030-01-01T10:02:00Z" };
  await t.state.poll();
  assert.equal(t.state.shown.length, 2);
  assert.equal(t.state.shown[0].body, "Tu as reçu un nouveau message.");
  assert.equal(t.state.shown[1].body, "Une nouvelle séance est disponible.");
  await t.state.poll();
  assert.equal(t.state.shown.length, 2);
});

test("activer les alertes de séances ne notifie pas une séance antérieure et déconnexion arrête la surveillance", async () => {
  const t = setup();
  await t.elements["#notification-toggle"].click();
  t.state.row = { latest_message: null, latest_practice: "a", practice_created_at: "2030-01-01T09:00:00Z", observed_at: "2030-01-01T10:02:00Z" };
  await t.state.poll();
  assert.equal(t.state.shown.length, 0);
  t.state.user = null;
  t.state.listeners["ping-cloud-session"]();
  await t.state.poll();
  assert.equal(t.elements["#notification-toggle"].disabled, true);
});

test("un refus de permission reste visible et ne lance pas de surveillance", async () => {
  const t = setup();
  t.Notification.permission = "denied";
  await t.elements["#notification-toggle"].click();
  await settle();
  assert.match(t.elements["#notification-status"].textContent, /refusée/);
  assert.equal(t.state.calls.length, 0);
});

test("un renouvellement de session du même compte ne désactive pas les alertes", async () => {
  const t = setup();
  await t.elements["#notification-toggle"].click();
  t.state.listeners["ping-cloud-session"]();
  t.state.row = { latest_message: "1", latest_practice: null, practice_created_at: null, observed_at: "2030-01-01T10:01:00Z" };
  await t.state.poll();
  assert.equal(t.state.shown.length, 1);
  assert.equal(t.elements["#notification-toggle"].textContent, "Désactiver les notifications");
});
