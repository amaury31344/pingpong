"use strict";

const STORAGE_KEY = "ping-points-data-v2";
const LEGACY_KEY = "ping-points-data-v1";
const emptyData = () => ({ profile: null, matches: [], players: [], equipment: [], goal: "", arcadeRecords: {} });
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const number = value => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(value);
const signed = value => `${value > 0 ? "+" : ""}${number(value)}`;
const dateLabel = value => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
};
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";
const normalize = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
let noticeTimer;
let observedRaw = null;
let editingMatchId = null;
let pendingBackup = null;
let pendingBackupRaw = null;
let editingEquipmentId = null;
let souvenir = null;
let pendingPhoto = "";
let photoRequest = 0;
let photoProcessing = false;
const equipmentKinds = { racket: "Raquette", forehand: "Revêtement coup droit", backhand: "Revêtement revers" };

function showNotice(message, error = false) {
  const notice = $("#notice");
  notice.textContent = message;
  notice.classList.toggle("error", error);
  notice.hidden = false;
  const dialog = document.querySelector("dialog[open]");
  if (dialog && error) {
    let alert = dialog.querySelector(".dialog-alert");
    if (!alert) {
      alert = document.createElement("p");
      alert.className = "dialog-alert";
      alert.setAttribute("role", "alert");
      dialog.querySelector("form").prepend(alert);
    }
    alert.textContent = message;
  }
  clearTimeout(noticeTimer);
  if (!error) noticeTimer = setTimeout(() => { notice.hidden = true; }, 5000);
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    observedRaw = saved;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed.matches) || !Array.isArray(parsed.players)) throw new Error("Format invalide");
      return parsed;
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return emptyData();
    const old = JSON.parse(legacy);
    const matches = Array.isArray(old.matches) ? old.matches
      .filter(match => match.date && match.opponent && ["win", "loss"].includes(match.result) && Number.isFinite(Number(match.pointDelta)))
      .map(match => ({
        id: crypto.randomUUID(), date: match.date, opponent: String(match.opponent),
        result: match.result, kind: "legacy", delta: Number(match.pointDelta),
        opponentReference: Number.isFinite(Number(match.opponentPoints)) ? Number(match.opponentPoints) : null
      })) : [];
    if (matches.length) showNotice("Anciens matchs conservés avec leurs points saisis. Renseigne ton profil et vérifie ton point de départ.");
    return { ...emptyData(), matches };
  } catch (error) {
    showNotice(`Impossible de lire les données enregistrées : ${error.message}. Elles n’ont pas été effacées.`, true);
    return null;
  }
}

let data = loadData();

function save(next) {
  try {
    if (localStorage.getItem(STORAGE_KEY) !== observedRaw) {
      showNotice("Les données ont changé dans un autre onglet. Copie tes modifications en cours puis recharge cette page avant de les enregistrer.", true);
      return false;
    }
    const raw = JSON.stringify(next);
    localStorage.setItem(STORAGE_KEY, raw);
    observedRaw = raw;
    data = next;
    return true;
  } catch (error) {
    showNotice(`Enregistrement impossible : ${error.message}`, true);
    return false;
  }
}

function chronological(matches) {
  return [...matches].sort((a, b) => a.date.localeCompare(b.date));
}

function estimatedPoints() {
  if (!data.profile || !Number.isFinite(data.profile.startingPoints)) return null;
  return data.profile.startingPoints + data.matches.reduce((total, match) => total + (match.kind === "friendly" ? 0 : match.delta), 0);
}

function table(matches, deletable) {
  if (!matches.length) return '<div class="empty">Aucun match pour le moment.<br>Ajoute ta première rencontre pour commencer ton suivi.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Adversaire</th><th>Résultat</th><th>Type</th><th>Variation</th>${deletable ? "<th></th>" : ""}</tr></thead><tbody>${matches.map(match => {
    const isWin = match.result === "win";
    const type = match.kind === "friendly" ? "Amical" : match.kind === "legacy" ? "Ancienne saisie" : "Compétition";
    const details = [match.notes ? `Notes : ${match.notes}` : "", match.strength ? `Point fort : ${match.strength}` : "", match.improvement ? `Axe de travail : ${match.improvement}` : ""].filter(Boolean).join("\n");
    return `<tr><td>${escapeHtml(dateLabel(match.date))}</td><td><strong>${escapeHtml(match.opponent)}</strong>${details ? `<details class="match-notes"><summary>Voir mon bilan</summary><p>${escapeHtml(details)}</p></details>` : ""}</td><td><span class="result-label ${isWin ? "win" : "loss"}">${isWin ? "Victoire" : "Défaite"}</span>${match.score ? ` · ${escapeHtml(match.score)}` : ""}</td><td>${type}</td><td>${match.kind === "friendly" ? "—" : `${signed(match.delta)} pts`}</td>${deletable ? `<td><button type="button" class="delete-btn" data-edit-match="${escapeHtml(match.id)}">Modifier</button> <button type="button" class="delete-btn" data-delete-match="${escapeHtml(match.id)}">Supprimer</button></td>` : ""}</tr>`;
  }).join("")}</tbody></table></div>`;
}

function renderChart(matches) {
  const chart = $("#chart");
  const chartEquipment = $("#chart-equipment");
  chartEquipment.hidden = true;
  if (!data.profile || !Number.isFinite(data.profile.startingPoints)) {
    chart.innerHTML = '<div class="empty">Renseigne ton profil et tes points de départ pour afficher ta progression.</div>';
    return;
  }
  const scored = chronological(matches.filter(match => match.kind !== "friendly"));
  if (!scored.length) {
    chart.innerHTML = '<div class="empty">Ajoute un match de compétition pour voir ta progression.</div>';
    return;
  }
  let total = data.profile.startingPoints;
  const values = [total, ...scored.map(match => { total += match.delta; return total; })];
  const min = Math.min(...values), max = Math.max(...values);
  const padding = Math.max((max - min) * .15, 2);
  const low = min - padding, range = max - min + 2 * padding;
  const coords = values.map((value, i) => ({ x: 45 + i * 720 / (values.length - 1), y: 145 - (value - low) / range * 120, value }));
  const points = coords.map(point => `${point.x},${point.y}`).join(" ");
  const circles = coords.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#3ba987"><title>${number(point.value)} points</title></circle>`).join("");
  const marked = (data.equipment || []).filter(item => item.date >= scored[0].date && item.date <= scored.at(-1).date);
  const markers = [...new Set(marked.map(item => item.date))].map(date => {
    const next = scored.findIndex(match => match.date >= date);
    let x = coords[next + 1].x;
    if (scored[next].date !== date) {
      const before = Date.parse(`${scored[next - 1].date}T00:00:00Z`);
      const after = Date.parse(`${scored[next].date}T00:00:00Z`);
      const fraction = (Date.parse(`${date}T00:00:00Z`) - before) / (after - before);
      x = coords[next].x + fraction * (x - coords[next].x);
    }
    return `<line x1="${x}" y1="15" x2="${x}" y2="145" stroke="#24659c" stroke-width="2" stroke-dasharray="4 4"/><text x="${x}" y="12" text-anchor="middle" fill="#24659c" font-size="12">M</text>`;
  }).join("");
  if (marked.length) {
    chartEquipment.textContent = `M : repère de matériel entre les matchs enregistrés. ${marked.map(item => `${dateLabel(item.date)} : ${equipmentKinds[item.kind]} — ${item.name}`).join(" ; ")}. Placement approximatif ; l’ordre dans une même journée est inconnu.`;
    chartEquipment.hidden = false;
  }
  chart.innerHTML = `<svg viewBox="0 0 800 180" role="img" aria-label="Progression de ${number(values[0])} à ${number(values.at(-1))} points sur ${scored.length} matchs"><line x1="45" y1="145" x2="765" y2="145" stroke="#e9f0ee"/><line x1="45" y1="85" x2="765" y2="85" stroke="#f1f5f3"/>${markers}<polyline fill="none" stroke="#3ba987" stroke-width="3" stroke-linejoin="round" points="${points}"/>${circles}<text x="45" y="170" fill="#91a2ae" font-size="12">Départ · ${number(values[0])} pts</text><text x="765" y="170" text-anchor="end" fill="#91a2ae" font-size="12">${number(values.at(-1))} pts</text></svg>`;
}

function renderEquipment() {
  const items = chronological(data.equipment || []).reverse();
  $("#equipment-list").innerHTML = items.length ? items.map(item => `<div class="equipment-row"><div><strong>${escapeHtml(equipmentKinds[item.kind])} · ${escapeHtml(item.name)}</strong><p>${escapeHtml(dateLabel(item.date))}${item.notes ? ` · ${escapeHtml(item.notes)}` : ""}</p></div><div class="equipment-actions"><button class="delete-btn" type="button" data-edit-equipment="${escapeHtml(item.id)}">Modifier</button><button class="delete-btn" type="button" data-delete-equipment="${escapeHtml(item.id)}">Supprimer</button></div></div>`).join("") : '<div class="empty">Ton carnet est vide. Ajoute ton premier changement de matériel.</div>';
}

function renderDirectory() {
  const query = normalize($("#directory-search").value.trim());
  const players = data.players.filter(player => normalize(`${player.name} ${player.city} ${player.club || ""}`).includes(query));
  $("#player-list").innerHTML = players.length ? players.map(player => `<div class="directory-row"><span class="avatar">${escapeHtml(initials(player.name))}</span><div><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(player.city)}${player.club ? ` · ${escapeHtml(player.club)}` : ""}${player.contact ? ` · Contact : ${escapeHtml(player.contact)}` : ""}</small></div><button type="button" class="delete-btn" data-delete-player="${escapeHtml(player.id)}">Supprimer</button></div>`).join("") : `<div class="empty">${query ? "Aucun joueur ne correspond à ta recherche." : "Ton répertoire est vide. Ajoute les joueurs que tu connais."}</div>`;
}

function renderPhotoPreview() {
  const preview = $("#profile-photo-preview");
  preview.hidden = !pendingPhoto;
  $("#profile-photo-placeholder").hidden = Boolean(pendingPhoto);
  if (pendingPhoto) preview.src = pendingPhoto;
  else preview.removeAttribute("src");
  $("#profile-photo-remove").hidden = !pendingPhoto;
}

function render(refreshForms = false) {
  if (!data) return;
  const profile = data.profile;
  $("#header-avatar").textContent = profile ? initials(`${profile.firstName} ${profile.lastName}`) : "?";
  if (profile?.photo && PingProfilePhoto.isValid(profile.photo)) {
    const image = document.createElement("img");
    image.src = profile.photo;
    image.alt = "";
    $("#header-avatar").replaceChildren(image);
  }
  const points = estimatedPoints();
  $("#points").textContent = points === null ? "—" : number(points);
  $("#points-detail").textContent = points === null ? "Renseigne ton point de départ" : `${signed(points - profile.startingPoints)} pts depuis le départ · estimé`;
  const matches = chronological(data.matches).reverse();
  const wins = matches.filter(match => match.result === "win").length;
  $("#played").textContent = matches.length;
  $("#played-detail").textContent = matches.length ? `${wins} victoire(s) · ${matches.length - wins} défaite(s)` : "Aucun match pour le moment";
  $("#wins").textContent = wins;
  $("#wins-detail").textContent = matches.length ? `Sur ${matches.length} match(s)` : "Prêt pour le prochain match ?";
  $("#win-rate").textContent = matches.length ? `${Math.round(wins / matches.length * 100)} %` : "—";
  $("#recent-matches").innerHTML = table(matches.slice(0, 5), false);
  renderFilteredMatches(matches);
  $("#recent").innerHTML = matches.length ? matches.slice(0, 4).map(match => `<div class="recent-item"><span class="result-icon ${match.result}">${match.result === "win" ? "V" : "D"}</span><div><strong>${escapeHtml(match.opponent)}</strong><small>${escapeHtml(dateLabel(match.date))}</small></div><span class="delta ${match.result}">${match.kind === "friendly" ? "Amical" : `${signed(match.delta)} pts`}</span></div>`).join("") : '<div class="empty">Tes derniers résultats apparaîtront ici.</div>';
  renderChart(data.matches);
  renderDirectory();
  renderEquipment();
  if (refreshForms) {
    $("#goal-input").value = data.goal || "";
    $("#goal-target").value = data.goalTarget?.points ?? "";
    $("#goal-date").value = data.goalTarget?.dueDate ?? "";
  }
  if (!data.goalTarget) $("#goal-progress").textContent = "Ajoute une cible chiffrée et une échéance si tu le souhaites.";
  else if (points === null) $("#goal-progress").textContent = "Renseigne ton point de départ pour comparer l’estimation à ton objectif.";
  else {
    const remaining = data.goalTarget.points - points;
    $("#goal-progress").textContent = remaining > 0
      ? `${number(remaining)} points estimés restants avant ${dateLabel(data.goalTarget.dueDate)}.`
      : `Cible de ${number(data.goalTarget.points)} points estimés atteinte ; échéance : ${dateLabel(data.goalTarget.dueDate)}.`;
  }
  if (refreshForms) {
    $("#profile-form").reset();
    if (profile) {
      for (const [key, value] of Object.entries(profile)) {
        const field = $("#profile-form").elements.namedItem(key);
        if (field) field.value = value ?? "";
      }
    }
    photoRequest++;
    photoProcessing = false;
    pendingPhoto = profile?.photo && PingProfilePhoto.isValid(profile.photo) ? profile.photo : "";
    renderPhotoPreview();
    $("#profile-photo-status").textContent = "JPEG, PNG ou WebP, 5 Mo maximum. La photo sera recadrée au centre.";
  }
}

function renderFilteredMatches(matches = chronological(data.matches).reverse()) {
  const filters = { kind: $("#filter-kind").value, result: $("#filter-result").value, from: $("#filter-from").value, to: $("#filter-to").value };
  const filtered = PingSports.filterMatches(matches, filters);
  const summary = PingSports.summarize(filtered);
  $("#filter-summary").textContent = filters.from && filters.to && filters.from > filters.to
    ? "La date de début doit précéder la date de fin."
    : `${summary.played} match(s) · ${summary.wins} victoire(s) · ${summary.played ? Math.round(summary.wins / summary.played * 100) + " % de réussite" : "aucun résultat"}`;
  const group = value => `${value.wins} victoire(s) sur ${value.played}`;
  $("#filter-levels").textContent = `Adversaires aux points de référence supérieurs : ${group(summary.groups.higher)} ; égaux : ${group(summary.groups.equal)} ; inférieurs : ${group(summary.groups.lower)}. Références manquantes : ${summary.groups.unknown} match(s).`;
  $("#all-matches").innerHTML = filtered.length ? table(filtered, true) : '<div class="empty">Aucun match ne correspond à ces filtres.</div>';
}

function navigate() {
  const allowed = { accueil: "Tableau de bord", matchs: "Mes matchs", joueurs: "Trouver des joueurs", arcade: "Ping Arcade", profil: "Mon profil", partager: "Partager et installer" };
  const requested = location.hash.slice(1);
  const page = Object.hasOwn(allowed, requested) ? requested : "accueil";
  document.querySelectorAll(".page").forEach(section => { section.hidden = section.id !== page; });
  document.querySelectorAll(".nav-item").forEach(link => {
    const active = link.dataset.page === page;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  $("#page-title").textContent = allowed[page];
}

window.addEventListener("hashchange", navigate);
$("#directory-search").addEventListener("input", () => { if (data) renderDirectory(); });
["#filter-kind", "#filter-result", "#filter-from", "#filter-to"].forEach(selector => $(selector).addEventListener("change", () => { if (data) renderFilteredMatches(); }));
$("#goal-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!data) return;
  const target = $("#goal-target").value, dueDate = $("#goal-date").value;
  if (Boolean(target) !== Boolean(dueDate)) return showNotice("Renseigne à la fois la cible de points et l’échéance, ou laisse les deux vides.", true);
  const goalTarget = target ? { points: Number(target), dueDate } : null;
  if (save({ ...data, goal: $("#goal-input").value.trim(), goalTarget })) { render(); showNotice("Objectif enregistré sur cet appareil."); }
});

function resetEquipmentForm() {
  editingEquipmentId = null;
  $("#equipment-form").reset();
  $("#equipment-submit").textContent = "Ajouter au carnet";
  $("#equipment-cancel").hidden = true;
}

$("#equipment-cancel").addEventListener("click", resetEquipmentForm);
$("#equipment-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!data) return showNotice("Les données enregistrées sont illisibles.", true);
  const form = new FormData(event.currentTarget);
  const name = form.get("name").trim();
  if (!name) return showNotice("Indique le nom du matériel.", true);
  const existing = data.equipment || [];
  if (editingEquipmentId && !existing.some(item => item.id === editingEquipmentId)) return showNotice("Cette entrée n’existe plus.", true);
  const item = { id: editingEquipmentId ?? crypto.randomUUID(), kind: form.get("kind"), name, date: form.get("date"), notes: form.get("notes").trim() };
  const equipment = editingEquipmentId ? existing.map(entry => entry.id === editingEquipmentId ? item : entry) : [...existing, item];
  const next = { ...data, equipment };
  try {
    PingBackup.validateBackup({ format: "ping-points-backup", version: 1, data: next });
  } catch (error) {
    return showNotice(`Matériel non enregistré : ${error.message}`, true);
  }
  if (save(next)) { resetEquipmentForm(); render(); showNotice("Matériel enregistré sur cet appareil."); }
});

$("#souvenir-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!data) return showNotice("Les données enregistrées sont illisibles.", true);
  const form = new FormData(event.currentTarget);
  const from = form.get("from"), to = form.get("to"), memory = form.get("memory").trim();
  if (!form.has("stats") && !form.has("delta") && !memory) return showNotice("Choisis au moins une information à afficher.", true);
  let summary;
  try {
    summary = PingSports.summarizePeriod(data.matches, from, to);
  } catch (error) {
    return showNotice(error.message, true);
  }
  souvenir = {
    raw: observedRaw,
    period: `Du ${dateLabel(from)} au ${dateLabel(to)}`,
    stats: form.has("stats") ? `${summary.played} match(s) · ${summary.wins} victoire(s) · ${summary.losses} défaite(s)` : "",
    delta: form.has("delta") ? (summary.scored ? `Variation estimée : ${signed(summary.delta)} pts · ${summary.scored} match(s) pris en compte` : "Aucun match avec variation sur cette période") : "",
    memory: memory ? `Mon souvenir : ${memory}` : ""
  };
  for (const key of ["period", "stats", "delta", "memory"]) {
    $(`#souvenir-${key}`).textContent = souvenir[key];
    $(`#souvenir-${key}`).hidden = !souvenir[key];
  }
  $("#souvenir-preview").hidden = false;
  $("#souvenir-download").hidden = false;
});

$("#souvenir-download").addEventListener("click", () => {
  if (!souvenir) return;
  if (observedRaw !== souvenir.raw || localStorage.getItem(STORAGE_KEY) !== souvenir.raw) return showNotice("Tes données ont changé depuis l’aperçu. Crée un nouvel aperçu avant de télécharger.", true);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 675;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("La création d’image n’est pas disponible dans ce navigateur.");
    context.fillStyle = "#102e48"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#95dcff"; context.font = "bold 24px sans-serif"; context.fillText("PING POINTS · CARTE SOUVENIR", 70, 65);
    context.fillStyle = "#ffffff"; context.font = "bold 58px sans-serif"; context.fillText("Mon parcours", 70, 145);
    context.font = "30px sans-serif";
    let y = 215;
    for (const text of [souvenir.period, souvenir.stats, souvenir.delta, souvenir.memory].filter(Boolean)) {
      let line = "";
      for (const word of text.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && context.measureText(next).width > 1050) {
          context.fillText(line, 70, y, 1050); y += 42; line = word;
        } else line = next;
      }
      if (line) { context.fillText(line, 70, y, 1050); y += 55; }
    }
    context.fillStyle = "#d0e7f2"; context.font = "22px sans-serif";
    context.fillText("Estimation personnelle, non officielle. Hors dérive et ajustements FFTT.", 70, 620, 1050);
    canvas.toBlob(blob => {
      if (!blob) return showNotice("La création de l’image a échoué.", true);
      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = "ping-points-carte-souvenir.png"; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        showNotice(`Téléchargement impossible : ${error.message}`, true);
      }
    }, "image/png");
  } catch (error) {
    showNotice(`Téléchargement impossible : ${error.message}`, true);
  }
});

function changeStartingPoints(direction) {
  const input = $("#starting-points");
  const current = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : 500;
  input.value = String(Math.min(5000, Math.max(0, Number((current + direction).toFixed(2)))));
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
$("#points-decrease").addEventListener("click", () => changeStartingPoints(-1));
$("#points-increase").addEventListener("click", () => changeStartingPoints(1));
$("#starting-points").addEventListener("keydown", event => {
  if ((event.key === "ArrowUp" || event.key === "ArrowDown") && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    event.preventDefault();
    changeStartingPoints(event.key === "ArrowUp" ? 1 : -1);
  }
});

$("#profile-photo-file").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  const request = ++photoRequest;
  photoProcessing = true;
  $("#profile-photo-status").textContent = "Préparation de la photo…";
  try {
    const photo = await PingProfilePhoto.prepare(file);
    if (request !== photoRequest) return;
    pendingPhoto = photo;
    renderPhotoPreview();
    $("#profile-photo-status").textContent = "Photo prête. Enregistre ton profil pour la conserver.";
  } catch (error) {
    if (request !== photoRequest) return;
    $("#profile-photo-status").textContent = `Photo non ajoutée : ${error.message}`;
  } finally {
    if (request === photoRequest) {
      photoProcessing = false;
      event.target.value = "";
    }
  }
});
$("#profile-photo-remove").addEventListener("click", () => {
  photoRequest++;
  photoProcessing = false;
  pendingPhoto = "";
  $("#profile-photo-file").value = "";
  renderPhotoPreview();
  $("#profile-photo-status").textContent = "Photo retirée de l’aperçu. Enregistre ton profil pour confirmer.";
});
$("#profile-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!data) return showNotice("Corrige les données enregistrées avant de modifier le profil.", true);
  if (photoProcessing) return showNotice("Attends la fin de la préparation de la photo.", true);
  const form = new FormData(event.currentTarget);
  const firstName = form.get("firstName").trim(), lastName = form.get("lastName").trim();
  if (!firstName || !lastName) return showNotice("Indique ton prénom et ton nom.", true);
  const profile = { firstName, lastName, license: form.get("license").trim(), club: form.get("club").trim(), city: form.get("city").trim(), startingPoints: Number(form.get("startingPoints")), bio: form.get("bio").trim(), photo: pendingPhoto };
  if (save({ ...data, profile })) { render(); showNotice("Ton profil a été enregistré sur cet appareil."); }
});

function openMatch(match = null) {
  if (!data) return showNotice("Les données enregistrées sont illisibles.", true);
  editingMatchId = match?.id ?? null;
  const form = $("#match-form");
  form.querySelector(".dialog-alert")?.remove();
  form.reset();
  form.elements.kind.querySelector('[value="legacy"]').hidden = match?.kind !== "legacy";
  $("#match-dialog-title").textContent = match ? "Modifier le match" : "Ajouter un match";
  const now = new Date();
  form.elements.date.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (match) {
    for (const field of ["date", "opponent", "result", "kind", "score", "notes", "strength", "improvement", "playerReference", "opponentReference", "coefficient"]) {
      if (match[field] !== undefined && match[field] !== null) form.elements[field].value = match[field];
    }
    if (match.kind === "legacy") form.elements.legacyDelta.value = match.delta;
  }
  updateMatchFields();
  $("#match-dialog").showModal();
}
document.querySelectorAll(".add-match").forEach(button => button.addEventListener("click", () => openMatch()));

function updateMatchFields() {
  const form = $("#match-form");
  const official = form.elements.kind.value === "official", legacy = form.elements.kind.value === "legacy";
  $("#official-fields").hidden = !official;
  $("#legacy-fields").hidden = !legacy;
  form.elements.playerReference.required = official;
  form.elements.opponentReference.required = official;
  for (const name of ["playerReference", "opponentReference", "coefficient"]) form.elements[name].disabled = !official;
  form.elements.legacyDelta.required = legacy;
  form.elements.legacyDelta.disabled = !legacy;
}
$("#match-form").elements.kind.addEventListener("change", updateMatchFields);
document.querySelectorAll(".close-dialog").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));

$("#match-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!data) return;
  const form = new FormData(event.currentTarget);
  const opponent = form.get("opponent").trim();
  if (!opponent) return showNotice("Indique le nom de l’adversaire.", true);
  const kind = form.get("kind"), result = form.get("result");
  const previous = editingMatchId ? data.matches.find(item => item.id === editingMatchId) : null;
  if (editingMatchId && !previous) return showNotice("Ce match n’existe plus.", true);
  const match = { ...previous, id: editingMatchId ?? crypto.randomUUID(), date: form.get("date"), opponent, kind, result, delta: 0, notes: form.get("notes").trim(), score: form.get("score").trim(), strength: form.get("strength").trim(), improvement: form.get("improvement").trim() };
  if (kind === "official") {
    match.playerReference = Number(form.get("playerReference"));
    match.opponentReference = Number(form.get("opponentReference"));
    match.coefficient = Number(form.get("coefficient"));
    match.delta = PingRanking.matchDelta(match.playerReference, match.opponentReference, result, match.coefficient);
  } else if (kind === "legacy") {
    match.delta = Number(form.get("legacyDelta"));
  } else {
    delete match.playerReference;
    delete match.opponentReference;
    delete match.coefficient;
  }
  const matches = previous ? data.matches.map(item => item.id === editingMatchId ? match : item) : [...data.matches, match];
  if (save({ ...data, matches })) {
    $("#match-dialog").close();
    render();
    showNotice(kind === "official" ? `Match enregistré : ${signed(match.delta)} points estimés.` : kind === "legacy" ? "Ancienne saisie enregistrée avec sa variation manuelle." : "Match amical enregistré, sans changement de points.");
  }
});

$("#add-player").addEventListener("click", () => { if (data) { $("#player-form").reset(); $("#player-form").querySelector(".dialog-alert")?.remove(); $("#player-dialog").showModal(); } });
$("#player-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!data) return;
  const form = new FormData(event.currentTarget);
  const name = form.get("name").trim(), city = form.get("city").trim();
  if (!name || !city) return showNotice("Indique le nom et la ville du joueur.", true);
  const player = { id: crypto.randomUUID(), name, city, club: form.get("club").trim(), contact: form.get("contact").trim() };
  if (save({ ...data, players: [...data.players, player] })) {
    $("#player-dialog").close(); renderDirectory(); showNotice("Joueur ajouté à ton répertoire personnel.");
  }
});

document.addEventListener("click", event => {
  if (!data) return;
  const matchButton = event.target.closest("[data-delete-match]");
  const editButton = event.target.closest("[data-edit-match]");
  const playerButton = event.target.closest("[data-delete-player]");
  const editEquipment = event.target.closest("[data-edit-equipment]");
  const deleteEquipment = event.target.closest("[data-delete-equipment]");
  if (editEquipment) {
    const item = (data.equipment || []).find(entry => entry.id === editEquipment.dataset.editEquipment);
    if (!item) return showNotice("Cette entrée n’existe plus.", true);
    editingEquipmentId = item.id;
    const form = $("#equipment-form");
    for (const key of ["kind", "name", "date", "notes"]) form.elements[key].value = item[key];
    $("#equipment-submit").textContent = "Enregistrer la modification";
    $("#equipment-cancel").hidden = false;
    form.elements.name.focus();
  }
  if (deleteEquipment && confirm("Supprimer cette entrée de matériel ?")) {
    if (save({ ...data, equipment: (data.equipment || []).filter(item => item.id !== deleteEquipment.dataset.deleteEquipment) })) {
      if (editingEquipmentId === deleteEquipment.dataset.deleteEquipment) resetEquipmentForm();
      render(); showNotice("Entrée de matériel supprimée.");
    }
  }
  if (editButton) {
    const match = data.matches.find(item => item.id === editButton.dataset.editMatch);
    if (match) openMatch(match);
    else showNotice("Ce match n’existe plus.", true);
  }
  if (matchButton && confirm("Supprimer ce match ?")) {
    if (save({ ...data, matches: data.matches.filter(match => match.id !== matchButton.dataset.deleteMatch) })) { render(); showNotice("Match supprimé."); }
  }
  if (playerButton && confirm("Supprimer ce joueur de ton répertoire ?")) {
    if (save({ ...data, players: data.players.filter(player => player.id !== playerButton.dataset.deletePlayer) })) { renderDirectory(); showNotice("Joueur supprimé."); }
  }
});

window.PingApp = {
  getRecord(key) { return data?.arcadeRecords?.[key] ?? 0; },
  saveRecord(key, value) {
    if (!data) return false;
    return save({ ...data, arcadeRecords: { ...data.arcadeRecords, [key]: value } });
  },
  backupSnapshot() {
    if (!data) throw new Error("Les données locales sont illisibles.");
    if (localStorage.getItem(STORAGE_KEY) !== observedRaw) throw new Error("Les données ont changé dans un autre onglet. Recharge la page après avoir copié tes modifications.");
    const backup = JSON.parse(JSON.stringify({ format: "ping-points-backup", version: 1, data }));
    PingBackup.validateBackup(backup);
    return { backup, raw: observedRaw };
  },
  restoreCloudBackup(backup, expectedRaw) {
    const restored = PingBackup.validateBackup(backup);
    if (expectedRaw !== observedRaw) throw new Error("Les données locales ont changé depuis l’aperçu. Recommence la restauration.");
    if (!save(restored)) return false;
    resetEquipmentForm();
    render(true);
    window.dispatchEvent(new Event("ping-data-restored"));
    return true;
  }
};

$("#backup-export").addEventListener("click", () => {
  if (!data) return showNotice("Les données sont illisibles : export impossible.", true);
  try {
    const blob = new Blob([JSON.stringify({ format: "ping-points-backup", version: 1, data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "ping-points-sauvegarde.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    showNotice(`Export impossible : ${error.message}`, true);
  }
});
$("#backup-import").addEventListener("click", () => $("#backup-file").click());
$("#backup-file").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("Le fichier dépasse 5 Mo.");
    const restored = PingBackup.validateBackup(JSON.parse(await file.text()));
    const describe = value => value ? `Profil : ${value.profile ? `${value.profile.firstName} ${value.profile.lastName}` : "aucun"}\nMatchs : ${value.matches.length}\nJoueurs : ${value.players.length}\nMatériel : ${(value.equipment || []).length}\nObjectif : ${value.goal || value.goalTarget ? "oui" : "non"}\nRecords : ${Object.keys(value.arcadeRecords || {}).length}` : "Données actuelles illisibles";
    pendingBackup = restored;
    pendingBackupRaw = observedRaw;
    $("#backup-dialog .dialog-alert")?.remove();
    $("#backup-preview").textContent = `Données actuelles\n${describe(data)}\n\nDonnées de la sauvegarde\n${describe(restored)}`;
    $("#backup-dialog").showModal();
  } catch (error) {
    showNotice(`Sauvegarde non restaurée : ${error.message}`, true);
  } finally { event.target.value = ""; }
});
$("#backup-dialog").addEventListener("close", () => { pendingBackup = null; pendingBackupRaw = null; });
$("#backup-confirm").addEventListener("click", () => {
  if (!pendingBackup) return;
  if (pendingBackupRaw !== observedRaw) return showNotice("Les données ont changé depuis l’aperçu. Annule et sélectionne à nouveau la sauvegarde.", true);
  if (save(pendingBackup)) {
    $("#backup-dialog").close(); resetEquipmentForm(); render(true); window.dispatchEvent(new Event("ping-data-restored")); showNotice("Sauvegarde restaurée.");
  }
});

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(error => {
    console.error("Installation hors ligne indisponible :", error);
    showNotice("Le mode hors ligne n’a pas pu être activé.", true);
  }));
}

navigate();
render(true);
