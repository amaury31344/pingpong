(function () {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const cloud = window.PingCloud;
  const status = $("#social-status"), list = $("#social-list"), panel = $("#chat-panel");
  const chatStatus = $("#chat-status"), messages = $("#chat-messages"), form = $("#chat-form");
  let selected = null, revision = 0, messageRevision = 0, activeTask = null;

  function say(element, text, error = false) {
    element.textContent = text;
    element.classList.toggle("error", error);
  }
  function current(id, version) { return cloud?.getUserId() === id && revision === version; }
  async function rpc(name, args) {
    const response = await cloud.client.rpc(name, args);
    if (response.error) throw response.error;
    return response.data;
  }
  function button(label, action, primary = false) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = `btn ${primary ? "btn-primary" : "btn-outline"}`;
    element.textContent = label;
    element.addEventListener("click", action);
    return element;
  }
  function closeChat() {
    messageRevision++;
    selected = null;
    panel.hidden = true;
    messages.replaceChildren();
    form.reset();
  }
  async function loadList(id, version) {
    const rows = await rpc("ping_list_social");
    if (!current(id, version)) return;
    if (selected && !rows.some(row => row.relationship === "friend" && row.user_id === selected.user_id)) closeChat();
    list.replaceChildren();
    say(status, rows.length ? `${rows.length} relation(s).` : "Aucune relation pour le moment. Recherche un joueur pour lui envoyer une demande.");
    for (const row of rows) {
      const card = document.createElement("article");
      card.className = "social-row";
      const title = document.createElement("strong");
      title.textContent = row.display_name;
      const detail = document.createElement("p");
      detail.textContent = { friend: "Ami", sent: "Demande envoyée", received: "Demande reçue", blocked: "Bloqué" }[row.relationship];
      const actions = document.createElement("div");
      actions.className = "backup-actions";
      if (row.relationship === "friend") actions.append(button("Discuter", () => openChat(row), true));
      if (row.relationship === "received") {
        actions.append(button("Accepter", () => perform(() => rpc("ping_respond_friend", { p_user: row.user_id, p_accept: true })), true));
        actions.append(button("Refuser", () => perform(() => rpc("ping_respond_friend", { p_user: row.user_id, p_accept: false }))));
      }
      if (row.relationship === "friend" || row.relationship === "sent") {
        actions.append(button(row.relationship === "friend" ? "Retirer" : "Annuler la demande", () => {
          if (row.relationship === "friend" && !confirm("Retirer cet ami et supprimer vos messages enregistrés dans l’application ?")) return;
          perform(() => rpc("ping_remove_friend", { p_user: row.user_id }), true);
        }));
      }
      if (row.relationship === "blocked") actions.append(button("Débloquer", () => perform(() => rpc("ping_unblock_user", { p_user: row.user_id }))));
      else actions.append(button("Bloquer", () => block(row.user_id, row.display_name)));
      card.append(title, detail, actions);
      list.append(card);
    }
  }
  async function perform(task, clearChat = false) {
    if (activeTask) return;
    const id = cloud?.getUserId();
    if (!id) { say(status, "Connecte-toi depuis Mon profil.", true); return; }
    const token = {};
    activeTask = token;
    const version = ++revision;
    try {
      await task();
      if (!current(id, version)) return;
      if (clearChat) closeChat();
      window.dispatchEvent(new Event("ping-social-changed"));
      await loadList(id, version);
    } catch (error) {
      if (current(id, version)) say(status, `Opération impossible : ${error.message}`, true);
    } finally { if (activeTask === token) activeTask = null; }
  }
  function block(user, name) {
    if (!confirm(`Bloquer ${name} ? Votre relation et vos messages enregistrés dans l’application seront supprimés pour vous deux.`)) return;
    perform(() => rpc("ping_block_user", { p_user: user }), true);
    location.hash = "#amis";
  }
  function request(user) {
    perform(() => rpc("ping_request_friend", { p_user: user }));
    location.hash = "#amis";
  }
  window.PingSocial = { block, request };

  async function loadMessages(id, version, user, request) {
    const rows = await rpc("ping_read_messages", { p_user: user });
    if (!current(id, version) || selected?.user_id !== user || request !== messageRevision) return;
    messages.replaceChildren();
    for (const message of [...rows].reverse()) {
      const item = document.createElement("article");
      item.className = `chat-message${message.sender === id ? " mine" : ""}`;
      const body = document.createElement("p");
      body.textContent = message.body;
      const time = document.createElement("small");
      time.textContent = `${message.sender === id ? "Toi" : selected.display_name} · ${new Date(message.created_at).toLocaleString("fr-FR")}`;
      item.append(body, time);
      if (message.sender !== id) item.append(button("Signaler ce message", () => reportMessage(message.id)));
      messages.append(item);
    }
    async function reportMessage(messageId) {
      const id = cloud?.getUserId(), peer = selected?.user_id, version = revision;
      if (!id || !peer || activeTask) return;
      if (!confirm("Signaler ce message ? Son contenu et les comptes concernés seront enregistrés pour examen par l’équipe du site. Le signalement ne bloque pas automatiquement le joueur.")) return;
      const token = {};
      activeTask = token;
      try {
        await rpc("ping_report_message", { p_message_id: messageId });
        if (current(id, version) && selected?.user_id === peer) say(chatStatus, "Signalement enregistré. Il ne bloque pas automatiquement le joueur.");
      } catch (error) {
        if (current(id, version) && selected?.user_id === peer) say(chatStatus, `Signalement impossible : ${error.message}`, true);
      } finally { if (activeTask === token) activeTask = null; }
    }
    say(chatStatus, rows.length === 100 ? "100 derniers messages affichés." : rows.length ? "" : "Aucun message pour le moment.");
    messages.scrollTop = messages.scrollHeight;
  }
  function openChat(row) {
    form.reset();
    selected = row;
    panel.hidden = false;
    $("#chat-title").textContent = `Discussion avec ${row.display_name}`;
    messages.replaceChildren();
    refreshChat();
  }
  async function refreshChat() {
    const id = cloud?.getUserId(), user = selected?.user_id;
    if (!id || !user) return;
    const version = revision, request = ++messageRevision;
    try { await loadMessages(id, version, user, request); }
    catch (error) { if (current(id, version) && selected?.user_id === user && request === messageRevision) say(chatStatus, `Lecture impossible : ${error.message}`, true); }
  }
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const id = cloud?.getUserId(), user = selected?.user_id;
    if (!id || !user || activeTask) return;
    const draft = $("#chat-body").value;
    const body = draft.trim();
    if (!body) return say(chatStatus, "Écris un message.", true);
    const token = {};
    activeTask = token;
    const version = revision;
    try {
      await rpc("ping_send_message", { p_user: user, p_body: body });
      if (!current(id, version) || selected?.user_id !== user) return;
      if ($("#chat-body").value === draft) $("#chat-body").value = "";
      await loadMessages(id, version, user, ++messageRevision);
    } catch (error) {
      if (current(id, version) && selected?.user_id === user) say(chatStatus, `Envoi impossible : ${error.message}`, true);
    } finally { if (activeTask === token) activeTask = null; }
  });
  $("#chat-refresh").addEventListener("click", refreshChat);
  $("#social-refresh").addEventListener("click", () => perform(async () => {}));
  window.addEventListener("ping-cloud-session", () => {
    revision++;
    activeTask = null;
    closeChat();
    list.replaceChildren();
    if (cloud?.getUserId()) perform(async () => {});
    else say(status, "Connecte-toi depuis Mon profil pour utiliser les amis et la messagerie.");
  });
  if (cloud?.getUserId()) perform(async () => {});
  else say(status, "Connecte-toi depuis Mon profil pour utiliser les amis et la messagerie.");
  setInterval(() => {
    if (selected && location.hash === "#amis" && document.visibilityState === "visible" && !activeTask) refreshChat();
  }, 10000);
})();
