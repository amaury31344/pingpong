(function (root) {
  "use strict";

  function buildProfile(data, choices) {
    const name = choices.name.trim(), club = choices.club.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Choisis un nom public de 2 à 80 caractères.");
    if (club.length > 100) throw new Error("Le nom du club est trop long.");
    let points = null;
    if (choices.points) {
      if (!data.profile || !Number.isFinite(data.profile.startingPoints)) throw new Error("Renseigne ton point de départ dans ton profil pour partager tes points estimés.");
      points = data.matches.reduce((total, match) => total + (match.kind === "friendly" ? 0 : match.delta), data.profile.startingPoints);
      if (!Number.isFinite(points) || points < 0 || points > 10000) throw new Error("Les points estimés sont hors des limites de publication.");
      points = Math.round(points * 10000) / 10000;
    }
    const played = choices.stats ? data.matches.length : null;
    const wins = choices.stats ? data.matches.filter(match => match.result === "win").length : null;
    const matches = choices.matches ? [...data.matches].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(match => ({
      date: match.date, result: match.result, kind: match.kind
    })) : null;
    return { p_name: name, p_club: club || null, p_points: points, p_played: played, p_wins: wins, p_matches: matches };
  }

  const api = { buildProfile };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PingDirectory = api;
})(globalThis);
