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
  scrollIntoView() {}
  querySelectorAll() { return []; }
}
function setup() {
  const ids = ["practice-preferences", "practice-create", "practice-status", "practice-list", "practice-recommendations", "practice-location", "practice-location-clear", "practice-recommend", "practice-refresh", "practice-copy", "practice-location-status", "practice-link", "practice-resume-only", "home-next-practice", "practice-repeat-status", "practice-repeat-cancel"];
  const elements = Object.fromEntries(ids.map(id => [`#${id}`, new Element()]));
  const fields = {
    title: "Test", starts: "2030-01-02T18:00", city: "Lille", venue: "Salle", goal: "resume", wheelchair: "unknown", fee: "Gratuit", equipment: "yes", changing: "unknown", beginners: "yes", capacity: "2", levelMin: "500", levelMax: "900"
  };
  elements["#practice-create"].values = fields;
  elements["#practice-create"].elements = Object.keys(fields).map(() => ({ disabled: false }));
  elements["#practice-create"].elements.title = new Element();
  elements["#practice-preferences"].values = { discoverable: true, alerts: true, days: ["1", "3"], period: "evening", goal: "resume", level: "500" };
  elements["#practice-preferences"].elements = [{ disabled: false }];
  const state = { user: "a", calls: [], listeners: {}, pending: null };
  const cloud = { getUserId: () => state.user, client: { channel(name) {
    const channel = { name, on(_event, filter, handler) { this.filter = filter; this.handler = handler; return this; }, subscribe() { return this; } };
    (state.channels ||= []).push(channel);
    return channel;
  }, async removeChannel(channel) { (state.removed ||= []).push(channel); },
  rpc: async (name, args) => {
    state.calls.push({ name, args });
    if (name === "ping_create_practice_with_level" && state.pending) return state.pending;
    if (name === "ping_create_practice_with_level") return { data: "12345678-1234-4234-8234-123456789abc", error: null };
    if (name === "ping_list_practices") return { data: state.sessions || [], error: null };
    if (name === "ping_practice_availability") return { data: state.availability || [], error: null };
    if (name === "ping_practice_levels") return { data: state.levels || [], error: null };
    if (name === "ping_list_social") return { data: state.social || [], error: null };
    if (name === "ping_send_message" && state.deliveryError) return { data: null, error: new Error("Envoi refusé") };
    if (name === "ping_my_practice_preferences") return { data: [], error: null };
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
    window, document: { querySelector: id => elements[id], createElement: () => new Element(), visibilityState: "visible", addEventListener() {} },
    navigator: {}, location: { href: "https://ping-points.vercel.app/#seances" },
    URL, Date, FormData, confirm: () => true
  });

  return { elements, state, window };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("le niveau est présenté avec la séance et une plage inversée est refusée", async () => {
  const t = setup();
  await settle();
  const id = "12345678-1234-4234-8234-123456789abc";
  t.state.sessions = [{ id, owner_id: "b", title: "Test", starts_at: "2030-01-02T18:00:00Z", city: "Lille", venue: "Salle", goal: "resume", fee: "Gratuit" }];
  t.state.levels = [{ id, level_min: 500, level_max: 900 }];
  t.elements["#practice-refresh"].handlers.click();
  await settle();
  assert.match(t.elements["#practice-list"].children[0].children[3].textContent, /500 à 900/);
  t.elements["#practice-create"].values.levelMin = "1000";
  t.elements["#practice-create"].values.levelMax = "500";
  t.elements["#practice-create"].handlers.submit({ preventDefault() {} });
  await settle();
  assert.match(t.elements["#practice-status"].textContent, /niveau minimum/i);
  assert.equal(t.state.calls.some(call => call.name === "ping_create_practice_with_level"), false);
});

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
  const created = t.state.calls.find(call => call.name === "ping_create_practice_with_level");
  assert.equal(created.args.p_city, "Lille");
  assert.equal(created.args.p_equipment, "yes");
  assert.equal(created.args.p_capacity, 2);
  assert.equal(created.args.p_level_min, 500);
  assert.equal(created.args.p_level_max, 900);
  assert.equal(t.elements["#practice-link"].value, "https://ping-points.vercel.app/?seance=12345678-1234-4234-8234-123456789abc#seances");
});

test("rejouer envoie le lien au partenaire après publication et signale un échec d’envoi", async () => {
  const t = setup();
  await settle();
  t.state.social = [{ user_id: "b", relationship: "friend" }];
  t.window.PingPractice.propose("b", "Camille");
  await settle();
  assert.match(t.elements["#practice-repeat-status"].textContent, /Camille/);
  t.state.deliveryError = true;
  t.elements["#practice-create"].handlers.submit({ preventDefault() {} });
  await settle();
  assert.equal(t.state.calls.find(call => call.name === "ping_send_message").args.p_user, "b");
  assert.match(t.elements["#practice-status"].textContent, /Séance publiée.*invitation non envoyée/);
  assert.match(t.elements["#practice-link"].value, /seance=/);
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

test("les joueurs peuvent s’inscrire et une séance complète désactive l’inscription", async () => {
  const t = setup();
  await settle();
  const id = "12345678-1234-4234-8234-123456789abc";
  t.state.sessions = [{ id, owner_id: "b", title: "Test", starts_at: "2030-01-02T18:00:00Z", city: "Lille", venue: "Salle", goal: "resume", fee: "Gratuit" }];
  t.state.availability = [{ id, capacity: 1, attendees: 0, joined: false }];
  t.elements["#practice-refresh"].handlers.click();
  await settle();
  let card = t.elements["#practice-list"].children[0];
  assert.match(card.children[4].textContent, /1 \/ 1/);
  card.children[5].children[2].handlers.click();
  await settle();
  assert.equal(t.state.calls.find(call => call.name === "ping_set_practice_attendance").args.p_join, true);
  t.state.availability = [{ id, capacity: 1, attendees: 1, joined: false }];
  t.elements["#practice-refresh"].handlers.click();
  await settle();
  card = t.elements["#practice-list"].children[0];
  assert.equal(card.children[5].children[2].disabled, true);
  t.state.availability = [{ id, capacity: 1, attendees: 1, joined: true }];
  t.elements["#practice-refresh"].handlers.click();
  await settle();
  card = t.elements["#practice-list"].children[0];
  assert.equal(card.children[5].children[2].textContent, "Annuler ma participation");
  assert.match(t.elements["#home-next-practice"].textContent, /Test.*Lille/);
  card.children[5].children[2].handlers.click();
  await settle();
  assert.equal(t.state.calls.filter(call => call.name === "ping_set_practice_attendance").at(-1).args.p_join, false);
});
