(function (root) {
  "use strict";
  const bands = [
    [25, 6, -5, 6, -5],
    [50, 5.5, -4.5, 7, -6],
    [100, 5, -4, 8, -7],
    [150, 4, -3, 10, -8],
    [200, 3, -2, 13, -10],
    [300, 2, -1, 17, -12.5],
    [400, 1, -0.5, 22, -16],
    [500, 0.5, 0, 28, -20],
    [Infinity, 0, 0, 40, -29]
  ];

  function matchDelta(playerReference, opponentReference, result, coefficient) {
    if (![playerReference, opponentReference, coefficient].every(Number.isFinite) ||
        playerReference < 0 || opponentReference < 0 || coefficient <= 0 ||
        !["win", "loss"].includes(result)) {
      throw new Error("Données de calcul invalides.");
    }
    const gap = Math.abs(playerReference - opponentReference);
    const band = bands.find(row => gap < row[0]);
    const expected = result === "win" ? playerReference >= opponentReference : playerReference <= opponentReference;
    const index = expected ? (result === "win" ? 1 : 2) : (result === "win" ? 3 : 4);
    return Math.round(band[index] * coefficient * 10000) / 10000;
  }

  const api = { matchDelta };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PingRanking = api;
})(globalThis);
