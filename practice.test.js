"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("practice.js", "utf8");

class Element {
  constructor() {
    this.handlers = {};
    this.children = [];
    this.textContent = "";
    this.value = "";
    this.elements = [];
    this.classList = { toggle() {} };
  }
  addEventListener(name, fn) { this.handlers[name] = fn; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  reset() {}
  focus() {}
  select() {}
  querySelectorAll() { return []; }
}
function setup() {
  const ids = ["practice-preferences", "practice-create", "practice-status", "practice-list", "practice-recommendations", "practice-location", "practice-location-clear", "practice-recommend", "practice-refresh", "practice-copy", "practice-location-status", "practice-link", "practice-resume-only"];
  const elements = Object.fromEntries(ids.map(id => [`#${id}`, new Element()]));
  const fields = {
    title: "Test", starts: "2030-01-02T18:00", city: "Lille", venue: "Salle", goal: "resume", wheelchair: "unknown", fee: "Gratuit", equipment: "yes", changing: "unknown", beginners: "yes"
  };
  elements["#practice-create"].values = fields;
  elements["#practice-create"].elements = Object.keys(fields).map(() => ({ disabled: false }));
  elements["#practice-preferences"].values = { discoverable: true, alerts: true, days: ["1", "3"], period: "evening", goal: "resume", level: "500" };
  elements["#practice-preferences"].elements = [{ disabled: false }];
  const state = { user: "a", calls: [], listeners: {}, pending: null };
  const cloud = { getUserId: () => state.user, client: { rpc: async (name, args) => {
    state.calls.push({ name, args });
    if (name === "ping_create_practice" && state.pending) return state.pending;
    if (name === "ping_create_practice") return { data: "12345678-1234-4234-8234-123456789abc", error: null };
    if (name === "ping_my_practice_preferences" || name === "ping_list_practices") return { data: [], error: null };
    return { data: [], error: null };
  } } };
  const window = { PingCloud: cloud, PingSocial: { request() {} }, addEventListener: (name, fn) => { state.listeners[name] = fn; } };
  class FormData {
    constructor(form) { this.values = form.elements.some(field => field.disabled) ? {} : { ...form.values }; }
    get(key) { return this.values[key] ?? null; }
    has(key) { return Boolean(this.values[key]); }
    getAll(key) { return this.values[key] ?? []; }
  }
  vm.runInNewContext(source, {
    window, document: { querySelector: id => elements[id], createElement: () => new Element() },
    navigator: {}, location: { href: "https://ping-points.vercel.app/#seances" },
    URL, Date, FormData, confirm: () => true
  });
  return { elements, state };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("les choix et la séance sont envoyés avec les valeurs choisies avant désactivation", async () => {
  const t = setup();
  await settle();
  t.elements["#practice-preferences"].handlers.submit({ preventDefault() {} });
  await settle();
  const prefs = t.state.calls.find(call => call.name === "ping_save_practice_preferences");
  assert.equal(prefs.args.p_alerts, true);
  assert.deepEqual(Array.from(prefs.args.p_days), [1, 3]);
  assert.equal(prefs.args.p_goal, "resume");
  t.elements["#practice-create"].handlers.submit({ preventDefault() {} });
  await settle();
  const created = t.state.calls.find(call => call.name === "ping_create_practice");
  assert.equal(created.args.p_city, "Lille");
  assert.equal(created.args.p_equipment, "yes");
  assert.equal(t.elements["#practice-link"].value, "https://ping-points.vercel.app/?seance=12345678-1234-4234-8234-123456789abc#seances");
});

test("une réponse de création d’un ancien compte ne révèle pas son lien au compte suivant", async () => {
  const t = setup();
  await settle();
  let resolve;
  t.state.pending = new Promise(done => { resolve = done; });
  t.elements["#practice-create"].handlers.submit({ preventDefault() {} });
  t.state.user = "b";
  t.state.listeners["ping-cloud-session"]();
  resolve({ data: "12345678-1234-4234-8234-123456789abc", error: null });
  await settle();
  assert.equal(t.elements["#practice-link"].value, "");
});
