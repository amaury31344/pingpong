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

  const api = { filterMatches, summarize };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PingSports = api;
})(globalThis);
