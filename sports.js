(function (root) {
  "use strict";

  function filterMatches(matches, filters) {
    return matches.filter(match =>
      (filters.kind === "all" || match.kind === filters.kind) &&
      (filters.result === "all" || match.result === filters.result) &&
      (!filters.from || match.date >= filters.from) &&
      (!filters.to || match.date <= filters.to)
    );
  }

  function summarize(matches) {
    const groups = { higher: { played: 0, wins: 0 }, equal: { played: 0, wins: 0 }, lower: { played: 0, wins: 0 }, unknown: 0 };
    for (const match of matches) {
      if (!Number.isFinite(match.playerReference) || !Number.isFinite(match.opponentReference)) {
        groups.unknown++;
        continue;
      }
      const key = match.opponentReference > match.playerReference ? "higher" : match.opponentReference < match.playerReference ? "lower" : "equal";
      groups[key].played++;
      if (match.result === "win") groups[key].wins++;
    }
    return { played: matches.length, wins: matches.filter(match => match.result === "win").length, groups };
  }

  function summarizePeriod(matches, from, to) {
    const validDate = value => {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    if (!validDate(from) || !validDate(to) || from > to) throw new Error("Choisis une période valide.");
    const selected = matches.filter(match => match.date >= from && match.date <= to);
    const scored = selected.filter(match => match.kind !== "friendly");
    const wins = selected.filter(match => match.result === "win").length;
    return { played: selected.length, wins, losses: selected.length - wins, scored: scored.length, delta: scored.reduce((sum, match) => sum + match.delta, 0) };
  }

  const api = { filterMatches, summarize, summarizePeriod };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PingSports = api;
})(globalThis);
