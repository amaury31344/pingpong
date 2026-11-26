"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Game, PLAYER_Y, AI_Y } = require("./arcade-engine.js");

test("les rebonds dépendent de l'impact et comptent les renvois", () => {
  const game = new Game("normal", false, () => 0.5);
  game.serve();
  game.ball = { x: game.playerX + 30, y: PLAYER_Y - 12, vx: 0, vy: 420 };
  assert.ok(game.step(1 / 60).includes("hit"));
  assert.ok(game.ball.vx > 0 && game.ball.vy < 0);
  assert.equal(game.returns, 1);
  assert.equal(game.longest, 1);
  game.ball = { x: game.aiX, y: AI_Y + 12, vx: 0, vy: -420 };
  assert.ok(game.step(1 / 60).includes("hit"));
  assert.equal(game.longest, 2);
});

test("les murs latéraux renvoient la balle et la vitesse est plafonnée", () => {
  const game = new Game("easy", false);
  game.serve();
  game.ball = { x: 51, y: 500, vx: -400, vy: 300 };
  game.step(1 / 60);
  assert.ok(game.ball.vx > 0);
  game.ball.vx = 0; game.ball.vy = 760;
  game.reflect(game.playerX, -1);
  assert.ok(Math.hypot(game.ball.vx, game.ball.vy) <= 760.0001);
});

test("le match exige 11 points et deux points d'écart", () => {
  const game = new Game("easy", false);
  game.playerScore = 10; game.aiScore = 10;
  game.serve(); game.ball.y = -10; game.ball.vy = -420;
  assert.deepEqual(game.step(1 / 60), ["player-point"]);
  assert.equal(game.state, "between");
  game.serve(); game.ball.y = -10; game.ball.vy = -420;
  assert.deepEqual(game.step(1 / 60), ["player-point", "finished"]);
  assert.equal(game.state, "finished");
  assert.equal(game.playerScore, 12);
});

test("un tir manqué donne le point à l'adversaire et réinitialise l'échange", () => {
  const game = new Game("normal", false, () => 0.5);
  game.serve(); game.rally = 3; game.longest = 3;
  game.ball = { x: 60, y: 1009, vx: 0, vy: 420 };
  assert.deepEqual(game.step(1 / 60), ["ai-point"]);
  assert.equal(game.aiScore, 1);
  assert.equal(game.state, "between");
  game.serve();
  assert.equal(game.rally, 0);
  assert.equal(game.longest, 3);
});

test("les niveaux et le mode découverte changent les paramètres", () => {
  const easy = new Game("easy", false, () => 0.5);
  const hard = new Game("hard", true, () => 0.5);
  easy.serve(); hard.serve();
  assert.ok(easy.difficulty.speed < hard.difficulty.speed);
  assert.ok(easy.difficulty.reaction > hard.difficulty.reaction);
  assert.ok(Math.hypot(...[hard.ball.vx, hard.ball.vy]) < Math.hypot(...[easy.ball.vx, easy.ball.vy]));
});

test("en coopération le second joueur déplace la raquette et un raté termine l’échange sans points", () => {
  const game = new Game("normal", false, () => 0.5, true);
  game.movePartner(200);
  game.serve();
  game.ball = { x: 200, y: AI_Y + 12, vx: 0, vy: -420 };
  assert.ok(game.step(1 / 60).includes("hit"));
  assert.equal(game.aiX, 200);
  game.ball = { x: 60, y: 1009, vx: 0, vy: 420 };
  assert.deepEqual(game.step(1 / 60), ["rally-end"]);
  assert.equal(game.playerScore + game.aiScore, 0);
  assert.equal(game.longest, 1);
  game.serve();
  assert.equal(game.rally, 0);
});
