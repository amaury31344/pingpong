"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function setup(profile, draft = "") {
  const elements = {
    "#my-club-form": { addEventListener(type, handler) { this[type] = handler; } },
    "#my-club": { value: "" },
    "#profile-club": { value: draft },
    "#profile-draft-status": { textContent: "" }
  };
  const context = {
    $: selector => elements[selector],
    data: { profile, matches: [], players: [] },
    save(next) { context.data = next; return true; },
    render() {},
    showNotice(message) { context.notice = message; }
  };
  const source = fs.readFileSync("app.js", "utf8");
  const start = source.indexOf('$("#my-club-form").addEventListener("submit"');
  const end = source.indexOf("\nfunction openMatch(", start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  return { elements, context, submit: () => elements["#my-club-form"].submit({ preventDefault() {} }) };
}

test("enregistre ou retire le club sans perdre les autres données du profil", () => {
  const t = setup({ firstName: "Test", club: "Ancien", city: "Lille", startingPoints: 500 }, "Ancien");
  t.elements["#my-club"].value = "  Nouveau  ";
  t.submit();
  assert.equal(t.context.data.profile.club, "Nouveau");
  assert.equal(t.context.data.profile.city, "Lille");
  assert.equal(t.elements["#profile-club"].value, "Nouveau");
  t.elements["#my-club"].value = "";
  t.submit();
  assert.equal(t.context.data.profile.club, "");
});

test("conserve un brouillon différent et exige un profil existant", () => {
  const t = setup({ club: "Ancien" }, "Brouillon");
  t.elements["#my-club"].value = "Nouveau";
  t.submit();
  assert.equal(t.elements["#profile-club"].value, "Brouillon");
  assert.match(t.elements["#profile-draft-status"].textContent, /vérifie/);
  const noProfile = setup(null);
  noProfile.submit();
  assert.equal(noProfile.context.data.profile, null);
  assert.match(noProfile.context.notice, /Crée d’abord ton profil/);
});
