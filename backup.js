(function (root) {
  "use strict";
  const profilePhoto = typeof module !== "undefined" && module.exports ? require("./profile-photo.js") : root.PingProfilePhoto;
  const isText = (value, limit) => typeof value === "string" && value.length <= limit;
  const finite = value => typeof value === "number" && Number.isFinite(value);
  const validDate = value => {
    if (!isText(value, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  const recordKey = /^v1:(easy|normal|hard):(keyboard|mouse|touch):(standard|discovery)$/;

  function validateBackup(input) {
    if (!input || input.format !== "ping-points-backup" || input.version !== 1 || !input.data || typeof input.data !== "object") throw new Error("Format ou version de sauvegarde non reconnu.");
    const data = input.data;
    if (!Array.isArray(data.matches) || !Array.isArray(data.players) || data.matches.length > 10000 || data.players.length > 10000) throw new Error("Liste de matchs ou de joueurs invalide.");
    const profile = data.profile;
    if (profile !== null && (!profile || !isText(profile.firstName, 80) || !profile.firstName.trim() || !isText(profile.lastName, 80) || !profile.lastName.trim() || !isText(profile.license, 30) || !isText(profile.club, 100) || !isText(profile.city, 100) || !finite(profile.startingPoints) || profile.startingPoints < 0 || profile.startingPoints > 5000)) throw new Error("Profil invalide.");
    if (profile && ((profile.bio !== undefined && !isText(profile.bio, 300)) || (profile.photo !== undefined && profile.photo !== "" && !profilePhoto.isValid(profile.photo)))) throw new Error("Bio ou photo de profil invalide.");
    if (data.goal !== undefined && !isText(data.goal, 160)) throw new Error("Objectif invalide.");
    if (data.goalTarget !== undefined && data.goalTarget !== null && (!data.goalTarget || !finite(data.goalTarget.points) || data.goalTarget.points < 0 || data.goalTarget.points > 5000 || !validDate(data.goalTarget.dueDate))) throw new Error("Objectif chiffré invalide.");
    const ids = new Set();
    for (const match of data.matches) {
      if (!match || !isText(match.id, 100) || !match.id || ids.has(match.id) || !validDate(match.date) || !isText(match.opponent, 120) || !match.opponent.trim() || !["win", "loss"].includes(match.result) || !["official", "friendly", "legacy"].includes(match.kind) || !finite(match.delta) || (match.kind === "friendly" && match.delta !== 0) || (match.notes !== undefined && !isText(match.notes, 1000))) throw new Error("Match invalide.");
      if (match.kind === "official" && (!finite(match.playerReference) || match.playerReference < 0 || match.playerReference > 5000 || !finite(match.opponentReference) || match.opponentReference < 0 || match.opponentReference > 5000 || ![0.5, 0.75, 1, 1.25, 1.5, 2].includes(match.coefficient))) throw new Error("Références d’un match invalides.");
      if ((match.score !== undefined && !isText(match.score, 30)) || (match.strength !== undefined && !isText(match.strength, 500)) || (match.improvement !== undefined && !isText(match.improvement, 500))) throw new Error("Bilan de match invalide.");
      ids.add(match.id);
    }
    ids.clear();
    for (const player of data.players) {
      if (!player || !isText(player.id, 100) || !player.id || ids.has(player.id) || !isText(player.name, 120) || !player.name.trim() || !isText(player.city, 100) || !player.city.trim() || !isText(player.club, 100) || !isText(player.contact, 120)) throw new Error("Joueur invalide.");
      ids.add(player.id);
    }
    if (data.equipment !== undefined) {
      if (!Array.isArray(data.equipment) || data.equipment.length > 1000) throw new Error("Carnet de matériel invalide.");
      ids.clear();
      for (const item of data.equipment) {
        if (!item || !isText(item.id, 100) || !item.id || ids.has(item.id) || !["racket", "forehand", "backhand"].includes(item.kind) || !isText(item.name, 100) || !item.name.trim() || !validDate(item.date) || !isText(item.notes, 280)) throw new Error("Entrée de matériel invalide.");
        ids.add(item.id);
      }
    }
    if (data.arcadeRecords !== undefined) {
      if (!data.arcadeRecords || typeof data.arcadeRecords !== "object" || Array.isArray(data.arcadeRecords)) throw new Error("Records invalides.");
      for (const [key, value] of Object.entries(data.arcadeRecords)) {
        if (!recordKey.test(key) || !Number.isSafeInteger(value) || value < 0) throw new Error("Record invalide.");
      }
    }
    return data;
  }
  const api = { validateBackup };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PingBackup = api;
})(globalThis);
