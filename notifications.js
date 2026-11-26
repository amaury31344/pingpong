(function () {
  "use strict";
  const cloud = window.PingCloud;
  const toggle = document.querySelector("#notification-toggle");
  const status = document.querySelector("#notification-status");
  let enabled = false, user = null, generation = 0, snapshot = null, pending = false;

  function say(text, error = false) {
    status.textContent = text;
    status.classList.toggle("error", error);
  }
  function render() {
    toggle.textContent = enabled ? "Désactiver les notifications" : "Activer les notifications";
    toggle.disabled = !cloud?.getUserId() || pending;
  }
  function stop() {
    enabled = false;
    snapshot = null;
    user = null;
    generation++;
    pending = false;
    render();
  }
  async function getSnapshot() {
    const { data, error } = await cloud.client.rpc("ping_notification_snapshot");
    if (error) throw error;
    if (!Array.isArray(data) || data.length !== 1) throw new Error("Réponse de notification invalide.");
    return data[0];
  }
  function newerPractice(next, previous) {
    if (!next.latest_practice || !next.practice_created_at) return false;
    if (next.practice_created_at <= previous.observed_at) return false;
    if (!previous.practice_created_at) return true;
    return next.practice_created_at > previous.practice_created_at ||
      (next.practice_created_at === previous.practice_created_at && next.latest_practice > previous.latest_practice);
  }
  async function notify(body, hash) {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.showNotification) {
      await registration.showNotification("Ping Points", { body, tag: `ping-${hash}`, data: { hash } });
    } else {
      new Notification("Ping Points", { body, tag: `ping-${hash}` });
    }
  }
  async function poll() {
    if (!enabled || pending || cloud.getUserId() !== user) return;
    const id = user, version = generation;
    pending = true;
    render();
    try {
      const next = await getSnapshot();
      if (!enabled || cloud.getUserId() !== id || generation !== version) return;
      if (Notification.permission !== "granted") {
        stop();
        say("Autorisation de notification retirée dans le navigateur.", true);
        return;
      }
      if (next.latest_message && (!snapshot.latest_message || BigInt(next.latest_message) > BigInt(snapshot.latest_message))) {
        await notify("Tu as reçu un nouveau message.", "amis");
      }
      if (!enabled || cloud.getUserId() !== id || generation !== version) return;
      if (newerPractice(next, snapshot)) await notify("Une nouvelle séance est disponible.", "seances");
      if (!enabled || cloud.getUserId() !== id || generation !== version) return;
      snapshot = next;
      say("Notifications actives pendant que cette page reste ouverte. Les séances nécessitent aussi l’activation de leurs alertes.");
    } catch (error) {
      if (enabled && cloud.getUserId() === id && generation === version) say(`Notifications indisponibles : ${error.message}`, true);
    } finally {
      if (generation === version) { pending = false; render(); }
    }
  }
  toggle.addEventListener("click", async () => {
    if (enabled) {
      stop();
      say("Notifications désactivées sur cette page.");
      return;
    }
    if (pending || !cloud?.getUserId()) return;
    if (!window.isSecureContext || !("Notification" in window)) {
      say("Notifications indisponibles dans ce navigateur ou hors connexion sécurisée.", true);
      return;
    }
    const id = cloud.getUserId(), version = ++generation;
    pending = true;
    render();
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Autorisation refusée ou non accordée.");
      const baseline = await getSnapshot();
      if (cloud.getUserId() !== id || generation !== version) return;
      user = id;
      snapshot = baseline;
      enabled = true;
      say("Notifications actives pendant que cette page reste ouverte. Les séances nécessitent aussi l’activation de leurs alertes.");
    } catch (error) {
      if (cloud.getUserId() === id && generation === version) say(`Activation impossible : ${error.message}`, true);
    } finally {
      if (generation === version) { pending = false; render(); }
    }
  });
  window.addEventListener("ping-cloud-session", () => {
    if (enabled && cloud?.getUserId() === user) return;
    stop();
    say(cloud?.getUserId() ? "Active les notifications pour cette page si tu le souhaites." : "Connecte-toi pour activer les notifications.");
  });
  navigator.serviceWorker?.addEventListener("message", event => {
    if (event.data?.type === "ping-notification" && ["amis", "seances"].includes(event.data.hash)) {
      location.hash = `#${event.data.hash}`;
    }
  });
  setInterval(poll, 20000);
  render();
})();
