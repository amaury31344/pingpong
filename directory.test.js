"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const PingDirectory = require("./directory-core.js");
const PingProfilePhoto = require("./profile-photo.js");
const source = fs.readFileSync("directory.js", "utf8");

class Element {
  constructor() {
    this.handlers = {};
    this.children = [];
    this.textContent = "";
    this.value = "";
    this.elements = [];
    this.classList = { toggle() {} };
  }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  reset() {}
}

function setup(user) {
  const ids = ["online-directory-search", "directory-publish", "online-directory-status", "directory-sharing-status", "online-directory-results", "directory-own-profile", "online-directory-query", "directory-unpublish"];
  const elements = Object.fromEntries(ids.map(id => [`#${id}`, new Element()]));
  const state = {
    user, raw: "unchanged", calls: [],
    values: { name: "Joueur exemple", club: "", consent: true, bio: true, photo: true },
    data: { profile: { startingPoints: 500, bio: "Bio de test", photo: "data:image/jpeg;base64,/9j/2Q==", license: "secret" }, matches: [] }
  };
  const cloud = {
    getUserId: () => state.user,
    client: { rpc: async (name, args) => {
      state.calls.push({ name, args });
      if (name === "ping_my_social_profile") return { data: [], error: null };
      if (name === "ping_search_social_profiles") return { data: [{ user_id: "b", display_name: "<script>", club: null, estimated_points: null, played: null, recent_matches: null, updated_at: "2026-01-01T00:00:00Z", bio: "<img onerror=alert(1)>", photo: null }], error: null };
      return { data: 1, error: null };
    } }
  };
  const listeners = {};
  const window = { PingCloud: cloud, PingSocial: {}, addEventListener(name, fn) { listeners[name] = fn; } };
  class FormData {
    get(name) { return state.values[name]; }
    has(name) { return !!state.values[name]; }
  }
  vm.runInNewContext(source, {
    window, PingDirectory, PingProfilePhoto,
    PingApp: { backupSnapshot: () => ({ backup: { data: state.data }, raw: state.raw }) },
    document: { querySelector: id => elements[id], createElement: () => new Element() },
    FormData, confirm: () => true, Intl, Date
  });
  return { elements, state, listeners };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("la publication inclut seulement la bio et la photo choisies après confirmation", async () => {
  const t = setup("a");
  await settle();
  t.elements["#directory-publish"].handlers.submit({ preventDefault() {} });
  await settle();
  const call = t.state.calls.find(item => item.name === "ping_publish_social_profile");
  assert.equal(call.args.p_visibility, "public");
  assert.equal(call.args.p_bio, "Bio de test");
  assert.equal(call.args.p_photo, "data:image/jpeg;base64,/9j/2Q==");
  assert.doesNotMatch(JSON.stringify(call.args), /secret/);
});

test("la recherche publique est accessible sans compte et les contenus restent du texte", async () => {
  const t = setup(null);
  t.elements["#online-directory-query"].value = "joueur";
  t.elements["#online-directory-search"].handlers.submit({ preventDefault() {} });
  await settle();
  const card = t.elements["#online-directory-results"].children[0];
  assert.equal(card.children[0].textContent, "<script>");
  assert.equal(card.children[1].textContent, "<img onerror=alert(1)>");
  assert.equal(card.children[0].children.length, 0);
});
