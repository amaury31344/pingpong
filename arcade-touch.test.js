"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const engine = require("./arcade-engine.js");

class Element {
  constructor(value = "") {
    this.value = value;
    this.checked = false;
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.handlers = {};
  }
  addEventListener(name, fn) { this.handlers[name] = fn; }
  getBoundingClientRect() { return { left: 0, width: 100 }; }
  setPointerCapture() {}
  getContext() { return new Proxy({}, { get: () => () => {}, set: () => true }); }
  fire(name, props = {}) { this.handlers[name]({ preventDefault() {}, ...props }); }
}

test("les deux zones tactiles déplacent leurs raquettes simultanément et indépendamment", () => {
  const selectors = ["#arcade-canvas", "#arcade-difficulty", "#arcade-mode", "#arcade-control", "#arcade-discovery", "#arcade-sound", "#arcade-start", "#arcade-pause", "#arcade-quit", "#arcade-status", "#arcade-touch", "#arcade-partner-touch", "#arcade-record", "#arcade", "#arcade-opponent-label", "#arcade-player-label", "#arcade-score-label", "#arcade-opponent-score", "#arcade-player-score", "#arcade-coop-help"];
  const elements = Object.fromEntries(selectors.map(key => [key, new Element()]));
  elements["#arcade-difficulty"].value = "normal";
  elements["#arcade-mode"].value = "solo";
  elements["#arcade-control"].value = "touch";
  let game;
  class Game extends engine.Game {
    constructor(...args) { super(...args); game = this; }
  }
  vm.runInNewContext(fs.readFileSync("arcade.js", "utf8"), {
    PingArcadeEngine: { ...engine, Game },
    PingApp: { getRecord: () => 0, saveRecord: () => true },
    document: { hidden: false, querySelector: id => elements[id], addEventListener() {} },
    window: { matchMedia: () => ({ matches: true }), addEventListener() {} },
    location: { hash: "#arcade" }, requestAnimationFrame: () => 1, Math
  });
  elements["#arcade-mode"].value = "coop";
  elements["#arcade-mode"].fire("change");
  elements["#arcade-start"].fire("click");
  const upper = elements["#arcade-partner-touch"], lower = elements["#arcade-touch"];
  assert.equal(upper.hidden, false);
  assert.equal(lower.hidden, false);
  upper.fire("pointerdown", { pointerId: 1, clientX: 20 });
  lower.fire("pointerdown", { pointerId: 2, clientX: 80 });
  assert.equal(game.aiX, 144);
  assert.equal(game.playerX, 576);
  upper.fire("pointermove", { pointerId: 2, clientX: 50 });
  assert.equal(game.aiX, 144);
  upper.fire("pointermove", { pointerId: 1, clientX: 30 });
  lower.fire("pointermove", { pointerId: 2, clientX: 70 });
  assert.equal(game.aiX, 216);
  assert.ok(Math.abs(game.playerX - 504) < 0.001);
  upper.fire("pointercancel", { pointerId: 1 });
  upper.fire("pointerdown", { pointerId: 3, clientX: 50 });
  assert.equal(game.aiX, 360);
});
