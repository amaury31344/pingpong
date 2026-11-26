(function () {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const cloud = window.PingCloud;
  const searchForm = $("#online-directory-search"), publishForm = $("#directory-publish");
  const searchStatus = $("#online-directory-status"), sharingStatus = $("#directory-sharing-status");
  const results = $("#online-directory-results"), own = $("#directory-own-profile");
  let busy = false, revision = 0, lastUserId = null;

  function setStatus(element, text, error = false) {
    element.textContent = text;
    element.classList.toggle("error", error);
  }

  function setAvailability() {
    const disconnected = !cloud?.getUserId();
    for (const element of [...searchForm.elements, ...publishForm.elements]) {
      element.disabled = disconnected || (busy && element.tagName === "BUTTON");
    }
  }

  function isCurrent(id, version) {
    return cloud?.getUserId() === id && revision === version;
  }

  function renderProfile(profile) {
    const card = document.createElement("article");
    card.className = "online-player";
    const title = document.createElement("h4");
    title.textContent = profile.display_name;
    card.append(title);
    const line = text => {
      const p = document.createElement("p");
      p.textContent = text;
      card.append(p);
    };
    if (profile.club !== null) line(`Club déclaré : ${profile.club}`);
    if (profile.estimated_points !== null) line(`Points estimés : ${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(profile.estimated_points)} · non officiel`);
    if (profile.played !== null) {
      const rate = profile.played ? ` · ${Math.round(profile.wins / profile.played * 100)} % de victoires` : "";
      line(`${profile.played} match(s) enregistré(s) · ${profile.wins} victoire(s) · ${profile.played - profile.wins} défaite(s)${rate}`);
    }
    if (Array.isArray(profile.recent_matches)) {
      line(profile.recent_matches.length ? "Derniers matchs partagés (sans adversaire) :" : "Aucun match récent partagé.");
      if (profile.recent_matches.length) {
        const list = document.createElement("ul");
        const kinds = { official: "Compétition", friendly: "Amical", legacy: "Ancienne saisie" };
        for (const match of profile.recent_matches) {
          const item = document.createElement("li");
          item.textContent = `${match.date} · ${kinds[match.kind]} · ${match.result === "win" ? "Victoire" : "Défaite"}`;
          list.append(item);
        }
        card.append(list);
      }
    }
    line(`Déclaré par le joueur · mise à jour : ${new Date(profile.updated_at).toLocaleDateString("fr-FR")}`);
    return card;
  }

  async function loadOwn(id, version) {
    const { data, error } = await cloud.client.rpc("ping_my_directory_profile");
    if (!isCurrent(id, version)) return;
    if (error) {
      own.replaceChildren();
      return setStatus(sharingStatus, `Impossible de lire ton profil partagé : ${error.message}`, true);
    }
    own.replaceChildren();
    if (data[0]?.published) {
      setStatus(sharingStatus, "Ton profil est visible par les comptes connectés. Voici ce qui est partagé :");
      own.append(renderProfile(data[0]));
    } else {
      setStatus(sharingStatus, "Tu n’as pas publié de profil.");
    }
  }

  function sessionChanged() {
    revision++;
    const id = cloud?.getUserId();
    if (id !== lastUserId) {
      searchForm.reset();
      publishForm.reset();
      lastUserId = id;
    }
    results.replaceChildren();
    own.replaceChildren();
    setAvailability();
    if (!cloud) {
      setStatus(searchStatus, "Connexion en ligne indisponible : la recherche ne peut pas être chargée.", true);
      setStatus(sharingStatus, "Connexion en ligne indisponible : le partage ne peut pas être chargé.", true);
      return;
    }
    if (!id) {
      setStatus(searchStatus, "Connecte-toi depuis Mon profil pour rechercher.");
      setStatus(sharingStatus, "Connecte-toi depuis Mon profil pour partager.");
      return;
    }
    setStatus(searchStatus, "Recherche par nom public ou pseudonyme.");
    setStatus(sharingStatus, "Vérification de ton profil partagé…");
    const version = revision;
    loadOwn(id, version).catch(error => {
      if (isCurrent(id, version)) setStatus(sharingStatus, `Impossible de lire ton profil partagé : ${error.message}`, true);
    });
  }

  async function perform(status, action) {
    if (busy) return;
    const id = cloud?.getUserId();
    if (!id) return setStatus(status, "Connecte-toi depuis Mon profil.", true);
    busy = true;
    const version = ++revision;
    setAvailability();
    try {
      await action(id, version);
    } catch (error) {
      if (isCurrent(id, version)) setStatus(status, `Opération impossible : ${error.message}`, true);
    } finally {
      busy = false;
      setAvailability();
    }
  }

  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    perform(searchStatus, async (id, version) => {
      const query = $("#online-directory-query").value.trim();
      if (query.length < 2) throw new Error("Indique au moins deux caractères.");
      results.replaceChildren();
      setStatus(searchStatus, "Recherche en cours…");
      const { data, error } = await cloud.client.rpc("ping_search_directory", { p_query: query });
      if (!isCurrent(id, version)) return;
      if (error) throw error;
      results.replaceChildren();
      for (const profile of data) results.append(renderProfile(profile));
      setStatus(searchStatus, data.length ? `${data.length} profil(s) trouvé(s), 30 au maximum.` : "Aucun profil partagé ne correspond à cette recherche.");
    });
  });

  publishForm.addEventListener("submit", event => {
    event.preventDefault();
    perform(sharingStatus, async (id, version) => {
      const values = new FormData(publishForm);
      if (!values.has("consent")) throw new Error("Confirme ton âge et ton accord avant de publier.");
      const snapshot = PingApp.backupSnapshot();
      const profile = PingDirectory.buildProfile(snapshot.backup.data, {
        name: values.get("name"), club: values.get("club"), points: values.has("points"),
        stats: values.has("stats"), matches: values.has("matches")
      });
      const current = await cloud.client.rpc("ping_my_directory_profile");
      if (!isCurrent(id, version)) return;
      if (current.error) throw current.error;
      const expectedVersion = current.data[0]?.version ?? null;
      const details = [
        `Nom public : ${profile.p_name}`,
        `Club : ${profile.p_club || "non partagé"}`,
        `Points estimés : ${profile.p_points ?? "non partagés"}`,
        profile.p_played === null ? "Statistiques : non partagées" : `Statistiques : ${profile.p_played} match(s), ${profile.p_wins} victoire(s)`,
        profile.p_matches === null ? "Matchs récents : non partagés" : `Matchs récents sans nom d’adversaire :\n${profile.p_matches.map(match => `${match.date} · ${match.kind} · ${match.result === "win" ? "victoire" : "défaite"}`).join("\n") || "aucun"}`
      ].join("\n");
      if (!confirm(`Ces informations seront visibles par les autres comptes connectés et pourront être copiées :\n\n${details}\n\nPublier ou remplacer ton profil partagé ?`)) {
        await loadOwn(id, version);
        return;
      }
      if (!isCurrent(id, version)) return;
      if (PingApp.backupSnapshot().raw !== snapshot.raw) throw new Error("Tes données ont changé depuis l’aperçu. Recommence la publication.");
      const { error } = await cloud.client.rpc("ping_publish_directory", { p_expected_version: expectedVersion, ...profile });
      if (!isCurrent(id, version)) return;
      if (error) throw error;
      results.replaceChildren();
      setStatus(searchStatus, "Profil mis à jour. Relance la recherche pour actualiser les résultats.");
      setStatus(sharingStatus, "Profil partagé. Les modifications futures ne sont pas publiées automatiquement.");
      await loadOwn(id, version);
    });
  });

  $("#directory-unpublish").addEventListener("click", () => {
    perform(sharingStatus, async (id, version) => {
      const current = await cloud.client.rpc("ping_my_directory_profile");
      if (!isCurrent(id, version)) return;
      if (current.error) throw current.error;
      const expectedVersion = current.data[0]?.version ?? null;
      if (!confirm("Retirer ton profil de la recherche ? Les copies déjà faites par d’autres joueurs ne peuvent pas être supprimées.")) {
        await loadOwn(id, version);
        return;
      }
      if (!isCurrent(id, version)) return;
      const { error } = await cloud.client.rpc("ping_unpublish_directory", { p_expected_version: expectedVersion });
      if (!isCurrent(id, version)) return;
      if (error) throw error;
      own.replaceChildren();
      results.replaceChildren();
      setStatus(searchStatus, "Profil retiré. Relance la recherche pour actualiser les résultats.");
      setStatus(sharingStatus, "Profil retiré de la recherche.");
    });
  });

  window.addEventListener("ping-cloud-session", sessionChanged);
  sessionChanged();
})();
