(function () {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const cloud = window.PingCloud;
  const preferences = $("#practice-preferences"), create = $("#practice-create");
  const status = $("#practice-status"), list = $("#practice-list"), recommendations = $("#practice-recommendations");
  const goals = { training: "Entraînement", competition: "Compétition", resume: "Reprise tranquille", leisure: "Loisir" };
  const yesNo = { yes: "Oui", no: "Non", unknown: "À confirmer" };
  const days = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  let user, version = 0, busy = false, coordinates = null, savedGoal = null;

  function say(text, error = false) {
    status.textContent = text;
    status.classList.toggle("error", error);
  }
  function current(id, generation) { return user === id && cloud?.getUserId() === id && version === generation; }
  function availability() {
    for (const element of [...preferences.elements, ...create.elements]) element.disabled = !user || busy;
    for (const id of ["#practice-location", "#practice-location-clear", "#practice-recommend", "#practice-refresh", "#practice-copy"]) $(id).disabled = !user || busy;
  }
  async function rpc(name, args) {
    const { data, error } = await cloud.client.rpc(name, args);
    if (error) throw error;
    return data;
  }
  async function perform(task) {
    if (!user || busy) return;
    const id = user, generation = version;
    busy = true;
    availability();
    try { await task(id, generation); }
    catch (error) { if (current(id, generation)) say(`Opération impossible : ${error.message}`, true); }
    finally { if (current(id, generation)) { busy = false; availability(); } }
  }
  function locationStatus() {
    $("#practice-location-status").textContent = coordinates ? "Position approximative choisie. Enregistre tes choix pour l’envoyer." : "Aucune position choisie.";
  }
  function line(container, text) {
    const p = document.createElement("p");
    p.textContent = text;
    container.append(p);
  }
  function button(label, fn) {
    const b = document.createElement("button");
    b.className = "btn btn-outline";
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  }
  function invitation(id) {
    const url = new URL("https://ping-points.vercel.app/");
    url.searchParams.set("seance", id);
    url.hash = "seances";
    return url.href;
  }
  function renderSessions(rows, availabilityById, ownId, prefix = "") {
    if (!rows.length) { line(list, prefix || "Aucune séance à afficher."); return; }
    for (const row of rows) {
      const card = document.createElement("article");
      card.className = "online-player";
      const title = document.createElement("h4");
      title.textContent = row.title;
      card.append(title);
      line(card, `${row.display_name} · ${new Date(row.starts_at).toLocaleString("fr-FR")} · ${row.city} · ${row.venue}`);
      line(card, `Objectif : ${goals[row.goal]} · Tarif : ${row.fee}`);
      line(card, `Accès fauteuil : ${yesNo[row.wheelchair]} · Prêt de raquette : ${yesNo[row.equipment]} · Vestiaires : ${yesNo[row.changing]} · Débutants : ${yesNo[row.beginners]}`);
      const attendance = availabilityById.get(row.id);
      if (attendance) line(card, `Places pour les autres joueurs : ${Math.max(0, attendance.capacity - attendance.attendees)} / ${attendance.capacity} disponibles${attendance.joined ? " · Tu participes" : ""}.`);
      else line(card, "Places indisponibles : actualise les séances.");
      const actions = document.createElement("div");
      actions.className = "backup-actions";
      actions.append(button("Obtenir le lien", () => { $("#practice-link").value = invitation(row.id); $("#practice-link").focus(); $("#practice-link").select(); }));
      if (row.owner_id === ownId) actions.append(button("Supprimer", () => {
        if (!confirm("Supprimer cette séance et invalider son lien ?")) return;
        perform(async (id, generation) => {
          await rpc("ping_delete_practice", { p_id: row.id });
          if (!current(id, generation)) return;
          $("#practice-link").value = "";
          await loadSessions(id, generation);
          if (current(id, generation)) say("Séance supprimée.");
        });
      }));
      else {
        if (attendance && new Date(row.starts_at) > new Date()) {
          const join = button(attendance.joined ? "Annuler ma participation" : "Je participe", () => perform(async (id, generation) => {
            await rpc("ping_set_practice_attendance", { p_id: row.id, p_join: !attendance.joined });
            if (!current(id, generation)) return;
            await loadSessions(id, generation);
            if (current(id, generation)) say(attendance.joined ? "Participation annulée." : "Participation enregistrée.");
          }));
          join.disabled = !attendance.joined && attendance.attendees >= attendance.capacity;
          actions.append(join);
        }
        actions.append(button("Demander en ami", () => window.PingSocial.request(row.owner_id)));
      }
      card.append(actions);
      list.append(card);
    }
  }
  async function loadSessions(id, generation) {
    const rows = await rpc("ping_list_practices", { p_id: null });
    const invite = new URL(location.href).searchParams.get("seance");
    let invited = [];
    if (invite && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invite)) {
      invited = await rpc("ping_list_practices", { p_id: invite });
    }
    const combined = [...invited, ...rows.filter(row => !invited.some(item => item.id === row.id))];
    const availability = combined.length ? await rpc("ping_practice_availability", { p_ids: combined.map(row => row.id) }) : [];
    if (!current(id, generation)) return;
    list.replaceChildren();
    if (invite && !invited.length) line(list, "Invitation introuvable, expirée ou indisponible.");
    renderSessions(combined, new Map(availability.map(item => [item.id, item])), id, "Aucune séance à afficher. Active les alertes pour voir les demandes.");
  }
  async function loadPreferences(id, generation) {
    const rows = await rpc("ping_my_practice_preferences");
    if (!current(id, generation)) return;
    const row = rows[0];
    if (!row) return;
    preferences.elements.discoverable.checked = row.discoverable;
    preferences.elements.alerts.checked = row.alerts;
    preferences.elements.period.value = row.period || "";
    preferences.elements.goal.value = row.goal || "";
    savedGoal = row.goal;
    preferences.elements.level.value = row.level ?? "";
    for (const input of preferences.querySelectorAll('input[name="days"]')) input.checked = row.days.includes(Number(input.value));
    coordinates = row.latitude === null ? null : { latitude: Number(row.latitude), longitude: Number(row.longitude) };
    locationStatus();
  }
  function sessionChanged() {
    const id = cloud?.getUserId() ?? null;
    if (id === user) return;
    user = id;
    version++;
    busy = false;
    coordinates = null;
    savedGoal = null;
    preferences.reset();
    create.reset();
    $("#practice-resume-only").checked = false;
    list.replaceChildren();
    recommendations.replaceChildren();
    $("#practice-link").value = "";
    locationStatus();
    availability();
    if (!id) { say("Connecte-toi depuis Mon profil pour utiliser les séances."); return; }
    say("Chargement de tes choix…");
    perform(async (currentUser, generation) => {
      await Promise.all([loadPreferences(currentUser, generation), loadSessions(currentUser, generation)]);
      if (current(currentUser, generation)) say("Tes choix sont chargés. Les alertes et recommandations sont facultatives.");
    });
  }
  $("#practice-location").addEventListener("click", () => {
    if (!navigator.geolocation) { say("Géolocalisation indisponible dans ce navigateur.", true); return; }
    if (!confirm("Utiliser ta position arrondie à environ 0,1° ? Elle sera envoyée à Supabase lorsque tu enregistreras tes choix ; une distance approximative pourra être montrée aux autres participants.")) return;
    perform(async (id, generation) => {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }));
      if (!current(id, generation)) return;
      coordinates = { latitude: Math.round(position.coords.latitude * 10) / 10, longitude: Math.round(position.coords.longitude * 10) / 10 };
      locationStatus();
      say("Position choisie : enregistre tes préférences pour la conserver.");
    });
  });
  $("#practice-location-clear").addEventListener("click", () => { coordinates = null; locationStatus(); say("Position effacée du formulaire : enregistre pour la retirer de Supabase."); });
  preferences.addEventListener("submit", event => {
    event.preventDefault();
    const values = new FormData(preferences);
    perform(async (id, generation) => {
      const level = values.get("level");
      await rpc("ping_save_practice_preferences", {
        p_discoverable: values.has("discoverable"), p_alerts: values.has("alerts"),
        p_days: values.getAll("days").map(Number), p_period: values.get("period") || null,
        p_goal: values.get("goal") || null, p_level: level === "" ? null : Number(level),
        p_latitude: coordinates?.latitude ?? null, p_longitude: coordinates?.longitude ?? null
      });
      if (!current(id, generation)) return;
      savedGoal = values.get("goal") || null;
      recommendations.replaceChildren();
      await loadSessions(id, generation);
      if (current(id, generation)) say("Choix enregistrés.");
    });
  });
  $("#practice-recommend").addEventListener("click", () => perform(async (id, generation) => {
    const resumeOnly = $("#practice-resume-only").checked;
    if (resumeOnly && savedGoal !== "resume") throw new Error("Choisis et enregistre d’abord l’objectif « Reprise tranquille ».");
    const rows = await rpc("ping_practice_recommendations", { p_resume_only: resumeOnly });
    if (!current(id, generation)) return;
    recommendations.replaceChildren();
    if (!rows.length) line(recommendations, "Aucune suggestion pour le moment. Active les recommandations et renseigne tes critères.");
    for (const row of rows) {
      const card = document.createElement("article");
      card.className = "online-player";
      const title = document.createElement("h4");
      title.textContent = row.display_name;
      card.append(title);
      line(card, `Jours communs : ${row.shared_days.length ? row.shared_days.map(day => days[day]).join(", ") : "aucun ou non renseignés"} ; période : ${row.same_period ? "commune" : "différente ou non renseignée"}.`);
      line(card, `Objectif : ${row.same_goal ? "commun" : "différent ou non renseigné"} ; écart de niveau : ${row.level_difference === null ? "non renseigné" : `${row.level_difference} points`} ; distance approximative : ${row.distance_km === null ? "non renseignée" : `${row.distance_km} km`}.`);
      line(card, `${row.score} critère(s) favorable(s) : jour et période communs, même objectif, écart de 200 points maximum, distance de 50 km maximum.`);
      card.append(button("Demander en ami", () => window.PingSocial.request(row.user_id)));
      recommendations.append(card);
    }
  }));
  create.addEventListener("submit", event => {
    event.preventDefault();
    const f = new FormData(create);
    perform(async (id, generation) => {
      const date = new Date(f.get("starts"));
      if (Number.isNaN(date.getTime())) throw new Error("Date invalide.");
      const params = {
        p_title: f.get("title").trim(), p_starts_at: date.toISOString(), p_city: f.get("city").trim(),
        p_venue: f.get("venue").trim(), p_goal: f.get("goal"), p_wheelchair: f.get("wheelchair"),
        p_fee: f.get("fee").trim(), p_equipment: f.get("equipment"), p_changing: f.get("changing"), p_beginners: f.get("beginners"),
        p_capacity: Number(f.get("capacity"))
      };
      if (!confirm(`Publier cette séance auprès des comptes ayant activé les alertes ? Son lien permettra aussi à toute personne connectée de la voir et de le partager.\n\n${params.p_title}\n${date.toLocaleString("fr-FR")}\n${params.p_city} · ${params.p_venue}\n${goals[params.p_goal]}\nPlaces pour d’autres joueurs : ${params.p_capacity}\nTarif : ${params.p_fee}\nAccès fauteuil : ${yesNo[params.p_wheelchair]} ; prêt : ${yesNo[params.p_equipment]} ; vestiaires : ${yesNo[params.p_changing]} ; débutants : ${yesNo[params.p_beginners]}`)) return;
      const practiceId = await rpc("ping_create_practice_with_capacity", params);
      if (!current(id, generation)) return;
      create.reset();
      $("#practice-link").value = invitation(practiceId);
      await loadSessions(id, generation);
      if (current(id, generation)) say("Séance publiée. Son lien est prêt à être copié.");
    });
  });
  $("#practice-refresh").addEventListener("click", () => perform(async (id, generation) => {
    await loadSessions(id, generation);
    if (current(id, generation)) say("Séances actualisées.");
  }));
  $("#practice-copy").addEventListener("click", () => perform(async (id, generation) => {
    const input = $("#practice-link");
    if (!input.value) throw new Error("Choisis d’abord une séance.");
    input.focus(); input.select();
    if (!navigator.clipboard?.writeText) throw new Error("Copie automatique indisponible : copie le lien sélectionné.");
    await navigator.clipboard.writeText(input.value);
    if (current(id, generation)) say("Lien copié.");
  }));
  window.addEventListener("ping-cloud-session", sessionChanged);
  sessionChanged();
})();
