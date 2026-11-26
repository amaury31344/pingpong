(function (root) {
  "use strict";
  const ranking = typeof module !== "undefined" && module.exports ? require("./ranking.js") : root.PingRanking;
  const normalize = value => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
  function confrontations(matches, opponent) {
    const key = normalize(opponent);
    if (!key) return [];
    return matches.filter(match => normalize(match.opponent) === key)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  function simulate(reference, coefficient, lines) {
    if (!Number.isFinite(reference) || reference < 0 || reference > 5000 || ![0.5, 0.75, 1, 1.25, 1.5, 2].includes(coefficient)) throw new Error("Indique tes points de référence et un coefficient valides.");
    const rows = lines.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!rows.length || rows.length > 20) throw new Error("Indique entre 1 et 20 adversaires.");
    return rows.map((row, i) => {
      const parts = row.split(";");
      const name = parts[0]?.trim(), points = Number(parts[1]?.trim().replace(",", "."));
      if (parts.length !== 2 || !name || name.length > 120 || !parts[1].trim() || !Number.isFinite(points) || points < 0 || points > 5000) throw new Error(`Ligne ${i + 1} invalide : utilise Nom ; points.`);
      return { name, points, win: ranking.matchDelta(reference, points, "win", coefficient), loss: ranking.matchDelta(reference, points, "loss", coefficient) };
    });
  }
  const api = { confrontations, simulate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PingCompetition = api;
})(globalThis);
