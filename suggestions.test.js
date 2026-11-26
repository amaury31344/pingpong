"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("suggestions.js", "utf8");

function setup(fetchHandler) {
  const timers = new Map(), calls = [], forms = {};
  let nextTimer = 0;
  const document = { activeElement: null };
  class Element {
    constructor(id) {
      this.id = id;
      this.value = "";
      this.hidden = true;
      this.children = [];
      this.handlers = {};
      this.attributes = {};
      this.classList = { toggle() {} };
    }
    addEventListener(type, handler) { (this.handlers[type] ||= []).push(handler); }
    fire(type, event = {}) { for (const fn of this.handlers[type] || []) fn(event); }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    append(child) { this.children.push(child); }
    replaceChildren(...children) { this.children = children; }
    focus() { document.activeElement = this; }
    scrollIntoView() {}
  }
  const elements = {};
  for (const prefix of ["profile", "player", "practice"]) {
    forms[prefix] = new Element(`${prefix}-form`);
    for (const suffix of ["city", "city-options", "city-status"]) elements[`${prefix}-${suffix}`] = new Element(`${prefix}-${suffix}`);
    elements[`${prefix}-city`].form = forms[prefix];
  }
  forms.directory = new Element("directory-form");
  for (const prefix of ["profile", "player", "directory"]) {
    for (const suffix of ["club", "club-options", "club-status"]) elements[`${prefix}-${suffix}`] = new Element(`${prefix}-${suffix}`);
    elements[`${prefix}-club`].form = forms[prefix];
  }
  document.querySelector = selector => elements[selector.slice(1)];
  document.createElement = () => new Element("");
  vm.runInNewContext(source, {
    document, URL, AbortController, Date,
    fetch(url, options) { calls.push({ url: new URL(url), options }); return fetchHandler(new URL(url)); },
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  return {
    elements, forms, calls,
    runSearches() {
      for (const [id, timer] of [...timers]) {
        if (timer.delay === 400) { timers.delete(id); timer.fn(); }
      }
    },
    focus(id) { const element = elements[id]; element.focus(); element.fire("focus"); },
    type(id, value) { const element = elements[id]; element.value = value; element.fire("input"); }
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const ok = data => Promise.resolve({ ok: true, json: async () => data });
const city = (nom, code, postal, departement) => ({ nom, code, codesPostaux: [postal], departement: { code: departement } });

test("choix d’une ville puis d’un club au clavier, sans transmettre le texte du club", async () => {
  const t = setup(url => url.host === "geo.api.gouv.fr"
    ? ok([city("Lille", "59350", "59000", "59")])
    : ok({ results: [{ nom_complet: "LILLE METROPOLE TENNIS DE TABLE" }, { nom_complet: "ASSOCIATION SPORTIVE" }] }));
  t.focus("profile-city");
  t.type("profile-city", "Li");
  t.runSearches();
  await settle();
  assert.equal(t.elements["profile-city-options"].children[0].textContent, "Lille · 59000 · 59");
  t.elements["profile-city"].fire("keydown", { key: "ArrowDown", preventDefault() {} });
  t.elements["profile-city"].fire("keydown", { key: "Enter", preventDefault() {} });
  assert.equal(t.elements["profile-city"].value, "Lille");
  t.focus("profile-club");
  await settle();
  assert.equal(t.calls[1].url.searchParams.get("code_commune"), "59350");
  assert.equal(t.calls[1].url.searchParams.get("q"), "tennis de table");
  assert.equal(t.calls[1].url.searchParams.get("minimal"), "true");
  assert.equal(t.elements["profile-club-options"].children.length, 1);
  t.type("profile-club", "metropole");
  assert.equal(t.elements["profile-club-options"].children.length, 1);
  t.elements["profile-club-options"].children[0].fire("click");
  assert.equal(t.elements["profile-club"].value, "LILLE METROPOLE TENNIS DE TABLE");
  assert.equal(t.calls.length, 2);
});

test("une réponse ancienne ne remplace pas les suggestions d’une autre ville", async () => {
  let release;
  const t = setup(url => url.searchParams.get("nom") === "La"
    ? new Promise(resolve => { release = resolve; })
    : ok([city("Lille", "59350", "59000", "59")]));
  t.focus("practice-city");
  t.type("practice-city", "La");
  t.runSearches();
  t.type("practice-city", "Li");
  t.runSearches();
  await settle();
  release({ ok: true, json: async () => [city("Laval", "53130", "53000", "53")] });
  await settle();
  assert.match(t.elements["practice-city-options"].children[0].textContent, /^Lille/);
});

test("une ville homonyme exige un choix explicite avant la recherche de clubs", async () => {
  const t = setup(() => ok([city("Saint-Pierre", "97416", "97410", "974"), city("Saint-Pierre", "50430", "50200", "50")]));
  t.type("player-city", "Saint-Pierre");
  t.focus("player-club");
  await settle();
  assert.equal(t.calls.length, 1);
  assert.match(t.elements["player-club-status"].textContent, /Plusieurs communes/);
  assert.equal(t.elements["player-club"].value, "");
});

test("une panne laisse les champs en saisie libre", async () => {
  const t = setup(() => Promise.reject(new Error("network")));
  t.focus("profile-city");
  t.type("profile-city", "Lille");
  t.runSearches();
  await settle();
  assert.equal(t.elements["profile-city"].value, "Lille");
  assert.match(t.elements["profile-city-status"].textContent, /indisponibles.*librement/);
  t.focus("profile-club");
  await settle();
  assert.match(t.elements["profile-club-status"].textContent, /Suggestions indisponibles.*saisir le club librement/);
});

test("réinitialiser le formulaire empêche une ancienne recherche de clubs de s’afficher", async () => {
  let release;
  const t = setup(url => url.host === "geo.api.gouv.fr"
    ? ok([city("Lille", "59350", "59000", "59")])
    : new Promise(resolve => { release = resolve; }));
  t.type("profile-city", "Lille");
  t.focus("profile-club");
  await settle();
  t.forms.profile.fire("reset");
  release({ ok: true, json: async () => ({ results: [{ nom_complet: "LILLE TENNIS DE TABLE" }] }) });
  await settle();
  assert.equal(t.elements["profile-club-options"].children.length, 0);
  assert.equal(t.elements["profile-club-options"].hidden, true);
});
