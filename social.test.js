"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("social.js", "utf8");

class Element {
  constructor() {
    this.children = [];
    this.handlers = {};
    this.textContent = "";
    this.value = "";
    this.hidden = false;
    this.classList = { toggle() {} };
  }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  click() { return this.handlers.click(); }
}

function setup() {
  const ids = ["social-status", "social-list", "chat-panel", "chat-status", "chat-messages", "chat-form", "chat-title", "chat-body", "chat-refresh", "social-refresh"];
  const elements = Object.fromEntries(ids.map(id => [`#${id}`, new Element()]));
  elements["#chat-form"].reset = () => { elements["#chat-body"].value = ""; };
  const state = {
    user: null, calls: [],
    rows: [{ user_id: "b", display_name: "Bob", relationship: "friend" }, { user_id: "c", display_name: "Claire", relationship: "friend" }],
    messages: [{ id: 1, sender: "b", body: "<script>unsafe</script>", created_at: "2026-01-01T00:00:00Z" }]
  };
  const listeners = {};
  const window = {
    PingCloud: {
      getUserId: () => state.user,
      client: { rpc: async (name, args) => {
        state.calls.push({ name, args });
        if (state.rpc) return state.rpc(name, args);
        return { data: name === "ping_list_social" ? state.rows : name === "ping_read_messages" ? state.messages : null, error: null };
      } }
    },
    addEventListener(type, fn) { listeners[type] = fn; },
    dispatchEvent() {}
  };
  vm.runInNewContext(source, {
    window, document: { querySelector: id => elements[id], createElement: () => new Element(), visibilityState: "visible" },
    Event: class {}, location: { hash: "#amis" }, confirm: () => true, setInterval() {}, console
  });
  return { elements, state, listeners, window };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("les messages sont affichés comme texte et changer d’ami efface le brouillon", async () => {
  const t = setup();
  t.state.user = "a";
  t.listeners["ping-cloud-session"]();
  await settle();
  const rows = t.elements["#social-list"].children;
  rows[0].children[2].children[0].click();
  await settle();
  const message = t.elements["#chat-messages"].children[0].children[0];
  assert.equal(message.textContent, "<script>unsafe</script>");
  assert.equal(message.children.length, 0);
  t.elements["#chat-body"].value = "brouillon privé";
  rows[1].children[2].children[0].click();
  await settle();
  assert.equal(t.elements["#chat-body"].value, "");
  t.elements["#chat-body"].value = "Salut";
  await t.elements["#chat-form"].handlers.submit({ preventDefault() {} });
  const call = t.state.calls.find(item => item.name === "ping_send_message");
  assert.equal(call.args.p_user, "c");
  assert.equal(call.args.p_body, "Salut");
});

test("une réponse d’un ancien compte ne s’affiche pas après un changement de session", async () => {
  const t = setup();
  let release;
  t.state.rpc = name => name === "ping_list_social" && t.state.user === "a"
    ? new Promise(resolve => { release = resolve; })
    : Promise.resolve({ data: name === "ping_list_social" ? [] : null, error: null });
  t.state.user = "a";
  t.listeners["ping-cloud-session"]();
  await settle();
  t.state.user = "other";
  t.listeners["ping-cloud-session"]();
  await settle();
  release({ data: t.state.rows, error: null });
  await settle();
  assert.equal(t.elements["#social-list"].children.length, 0);
  assert.match(t.elements["#social-status"].textContent, /Aucune relation/);
});
