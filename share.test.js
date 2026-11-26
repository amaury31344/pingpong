"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");

const source = fs.readFileSync("share.js", "utf8");

function setup(navigator = {}) {
  const elements = new Map();
  for (const id of ["share-link", "share-app", "copy-app-link", "share-status", "install-app", "install-status"]) {
    elements.set(`#${id}`, {
      hidden: true, textContent: "", value: id === "share-link" ? "https://ping-points.vercel.app/" : "",
      classList: { toggle(_name, value) { this.error = value; } },
      addEventListener(type, handler) { this[type] = handler; },
      focus() { this.focused = true; },
      select() { this.selected = true; }
    });
  }
  const events = {};
  vm.runInNewContext(source, {
    document: { querySelector: selector => elements.get(selector) },
    navigator,
    window: { addEventListener(type, handler) { events[type] = handler; } }
  });
  return { elements, events, get: id => elements.get(`#${id}`) };
}

test("le partage et la copie transmettent uniquement le lien public", async () => {
  let shared;
  let copied;
  const t = setup({ share: async value => { shared = value; }, clipboard: { writeText: async value => { copied = value; } } });
  assert.equal(t.get("share-app").hidden, false);
  await t.get("share-app").click();
  await t.get("copy-app-link").click();
  assert.equal(shared.url, "https://ping-points.vercel.app/");
  assert.deepEqual(Object.keys(shared).sort(), ["text", "title", "url"]);
  assert.equal(copied, shared.url);
  assert.match(t.get("share-status").textContent, /copié/i);
});

test("si le presse-papiers échoue, le lien reste sélectionnable et l’erreur est indiquée", async () => {
  const t = setup({ clipboard: { writeText: async () => { throw new Error("refusé"); } } });
  assert.equal(t.get("share-app").hidden, true);
  await t.get("copy-app-link").click();
  assert.equal(t.get("share-link").selected, true);
  assert.match(t.get("share-status").textContent, /impossible/i);
  assert.equal(t.get("share-status").classList.error, true);
});

test("le bouton d’installation n’apparaît que lorsque le navigateur le propose", async () => {
  const t = setup();
  assert.equal(t.get("install-app").hidden, true);
  let prevented = false;
  t.events.beforeinstallprompt({ preventDefault() { prevented = true; }, async prompt() { return { outcome: "dismissed" }; } });
  assert.equal(prevented, true);
  assert.equal(t.get("install-app").hidden, false);
  await t.get("install-app").click();
  assert.equal(t.get("install-app").hidden, true);
  assert.match(t.get("install-status").textContent, /annulée/);
  t.events.appinstalled();
  assert.match(t.get("install-status").textContent, /installé/);
});

test("une erreur d’installation invite à suivre les étapes manuelles", async () => {
  const t = setup();
  t.events.beforeinstallprompt({ preventDefault() {}, async prompt() { throw new Error("échec"); } });
  await t.get("install-app").click();
  assert.match(t.get("install-status").textContent, /impossible/i);
  assert.equal(t.get("install-status").classList.error, true);
});
