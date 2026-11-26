"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const { validateBackup } = require("./backup.js");

const source = fs.readFileSync("cloud.js", "utf8");
const backup = {
  format: "ping-points-backup",
  version: 1,
  data: { profile: null, matches: [], players: [], equipment: [{ id: "material-1", kind: "racket", name: "Raquette", date: "2026-09-01", notes: "" }], goal: "", arcadeRecords: {} }
};

function setup() {
  const elements = new Map();
  for (const id of ["cloud-login", "cloud-actions", "cloud-status", "cloud-email", "cloud-compare", "cloud-upload", "cloud-download", "cloud-logout"]) {
    elements.set(`#${id}`, {
      hidden: false, disabled: false, value: "", textContent: "",
      classList: { toggle() {} },
      addEventListener(type, handler) { this[type] = handler; }
    });
  }
  const state = { remote: null, raw: "original", calls: [], confirmed: true, restored: 0, reads: 0 };
  let authChange;
  const client = {
    auth: {
      onAuthStateChange(callback) { authChange = callback; },
      async signInWithOtp(options) { state.calls.push(["login", options]); return { error: null }; },
      async signOut() { authChange("SIGNED_OUT", null); return { error: null }; }
    },
    from() {
      return { select() { return { eq(_key, id) { state.queryUser = id; return {
        async maybeSingle() {
          state.reads++;
          if (state.onRead) state.onRead(state.reads);
          return { data: state.remote, error: null };
        }
      }; } }; } };
    },
    async rpc(name, args) { state.calls.push([name, args]); return { error: null }; }
  };
  const context = {
    document: {
      querySelector(selector) { return elements.get(selector); },
      querySelectorAll() { return [...elements.values()].filter(element => element.click || element.submit); }
    },
    PingSupabase: { createClient() { return client; } },
    PingBackup: { validateBackup },
    PingApp: {
      backupSnapshot() { return { backup, raw: state.raw }; },
      restoreCloudBackup(value, raw) {
        assert.equal(value, backup);
        assert.equal(raw, state.raw);
        state.restored++;
        return true;
      }
    },
    window: { dispatchEvent() {} },
    Event: class { constructor(type) { this.type = type; } },
    confirm() { return state.confirmed; }
  };
  vm.runInNewContext(source, context);
  return {
    state, elements,
    login(id = "player-a") { authChange("SIGNED_IN", { user: { id, email: "player@example.test" } }); },
    async click(id) { elements.get(`#${id}`).click(); await new Promise(resolve => setTimeout(resolve, 0)); },
    async submit() { elements.get("#cloud-login").submit({ preventDefault() {} }); await new Promise(resolve => setTimeout(resolve, 0)); }
  };
}

test("le lien de connexion revient au site public et ne transmet pas de mot de passe", async () => {
  const t = setup();
  t.elements.get("#cloud-email").value = "player@example.test";
  await t.submit();
  assert.equal(t.state.calls[0][1].options.emailRedirectTo, "https://ping-points.vercel.app/");
  assert.equal(t.state.calls[0][1].email, "player@example.test");
  assert.equal(t.state.calls[0][1].password, undefined);
});

test("un envoi annulé ne remplace pas la sauvegarde", async () => {
  const t = setup();
  t.login();
  t.state.remote = { version: 3, payload: backup };
  t.state.confirmed = false;
  await t.click("cloud-upload");
  assert.equal(t.state.calls.length, 0);
  assert.equal(t.state.queryUser, "player-a");
});

test("un envoi confirmé utilise la version observée et le compte connecté", async () => {
  const t = setup();
  t.login();
  t.state.remote = { version: 3, payload: backup };
  await t.click("cloud-upload");
  const [name, args] = t.state.calls[0];
  assert.equal(name, "ping_save_backup");
  assert.equal(args.p_user_id, "player-a");
  assert.equal(args.p_expected_version, 3);
  assert.deepEqual(args.p_payload, backup);
});

test("une sauvegarde en ligne invalide ne modifie pas les données locales", async () => {
  const t = setup();
  t.login();
  t.state.remote = { version: 1, payload: { format: "incorrect" } };
  await t.click("cloud-download");
  assert.equal(t.state.restored, 0);
  assert.match(t.elements.get("#cloud-status").textContent, /impossible/i);
});

test("une restauration confirmée vérifie à nouveau la version en ligne", async () => {
  const t = setup();
  t.login();
  t.state.remote = { version: 1, payload: backup };
  await t.click("cloud-download");
  assert.equal(t.state.reads, 2);
  assert.equal(t.state.restored, 1);
});

test("une copie modifiée pendant la restauration ne remplace rien", async () => {
  const t = setup();
  t.login();
  t.state.remote = { version: 1, payload: backup };
  t.state.onRead = count => { if (count === 2) t.state.remote = { version: 2, payload: backup }; };
  await t.click("cloud-download");
  assert.equal(t.state.restored, 0);
  assert.match(t.elements.get("#cloud-status").textContent, /a changé/i);
});

test("les modifications locales pendant l’aperçu bloquent l’envoi", async () => {
  const t = setup();
  t.login();
  t.state.onRead = () => { t.state.raw = "modifié"; };
  await t.click("cloud-upload");
  assert.equal(t.state.calls.length, 0);
  assert.match(t.elements.get("#cloud-status").textContent, /locales ont changé/i);
});

test("comparer les copies n’écrase aucune donnée", async () => {
  const t = setup();
  t.login();
  t.state.remote = { version: 3, payload: backup, updated_at: "2026-09-01T10:00:00Z" };
  await t.click("cloud-compare");
  assert.equal(t.state.calls.length, 0);
  assert.equal(t.state.restored, 0);
  assert.match(t.elements.get("#cloud-status").textContent, /aucun changement/i);
});
