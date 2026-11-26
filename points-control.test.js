"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function setup() {
  const html = fs.readFileSync("index.html", "utf8");
  const tag = html.match(/<input id="starting-points"[^>]+>/)?.[0];
  assert.ok(tag);
  const initial = tag.match(/value="([^"]+)"/)?.[1];
  const elements = {
    "#starting-points": { value: initial, get valueAsNumber() { return this.value === "" ? NaN : Number(this.value); }, dispatchEvent() {}, addEventListener(type, fn) { this[type] = fn; } },
    "#points-decrease": { addEventListener(type, fn) { this[type] = fn; } },
    "#points-increase": { addEventListener(type, fn) { this[type] = fn; } }
  };
  const source = fs.readFileSync("app.js", "utf8");
  const start = source.indexOf("function changeStartingPoints(");
  const end = source.indexOf('$("#profile-photo-file").addEventListener("change"', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), { $: selector => elements[selector], Event: class {} });
  return elements;
}

test("les points proposés commencent à 500 et les boutons changent la valeur d’un point", () => {
  const e = setup(), input = e["#starting-points"];
  assert.equal(input.value, "500");
  e["#points-increase"].click();
  assert.equal(input.value, "501");
  e["#points-decrease"].click();
  e["#points-decrease"].click();
  assert.equal(input.value, "499");
  input.value = "554.5";
  e["#points-increase"].click();
  assert.equal(input.value, "555.5");
});

test("les commandes respectent les limites et les flèches du clavier changent d’un point", () => {
  const e = setup(), input = e["#starting-points"];
  input.value = "0";
  e["#points-decrease"].click();
  assert.equal(input.value, "0");
  input.value = "5000";
  e["#points-increase"].click();
  assert.equal(input.value, "5000");
  input.value = "501.25";
  let prevented = false;
  input.keydown({ key: "ArrowDown", preventDefault() { prevented = true; } });
  assert.equal(input.value, "500.25");
  assert.equal(prevented, true);
});
