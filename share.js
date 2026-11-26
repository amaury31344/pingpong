"use strict";

(() => {
  const link = document.querySelector("#share-link");
  const shareButton = document.querySelector("#share-app");
  const copyButton = document.querySelector("#copy-app-link");
  const shareStatus = document.querySelector("#share-status");
  const installButton = document.querySelector("#install-app");
  const installStatus = document.querySelector("#install-status");
  let installPrompt = null;

  function status(element, message, error = false) {
    element.textContent = message;
    element.classList.toggle("error", error);
  }

  link.addEventListener("focus", () => link.select());
  if (typeof navigator.share === "function") shareButton.hidden = false;
  shareButton.addEventListener("click", async () => {
    try {
      await navigator.share({ title: "Ping Points", text: "Découvre Ping Points !", url: link.value });
      status(shareStatus, "Menu de partage fermé.");
    } catch (error) {
      if (error.name !== "AbortError") status(shareStatus, "Partage impossible. Copie ou sélectionne le lien ci-dessus.", true);
    }
  });
  copyButton.addEventListener("click", async () => {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") throw new Error("Presse-papiers indisponible");
      await navigator.clipboard.writeText(link.value);
      status(shareStatus, "Lien copié !");
    } catch (error) {
      link.focus();
      link.select();
      status(shareStatus, "Copie automatique impossible : sélectionne et copie le lien ci-dessus.", true);
    }
  });

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    installButton.hidden = true;
    try {
      const choice = await prompt.prompt();
      status(installStatus, choice.outcome === "accepted" ? "Demande d’installation acceptée." : "Installation annulée. Tu peux aussi suivre les étapes ci-dessous.");
    } catch (error) {
      status(installStatus, "Installation impossible depuis ce bouton. Suis les étapes ci-dessous.", true);
    }
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.hidden = true;
    status(installStatus, "Ping Points est installé sur cet appareil.");
  });
})();
