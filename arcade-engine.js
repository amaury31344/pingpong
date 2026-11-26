(function (root) {
  "use strict";
  const WIDTH = 720, HEIGHT = 1000, LEFT = 40, RIGHT = 680;
  const PADDLE_WIDTH = 130, PLAYER_Y = 900, AI_Y = 100, RADIUS = 10;
  const DIFFICULTIES = {
    easy: { speed: 220, reaction: 0.42 },
    normal: { speed: 330, reaction: 0.22 },
    hard: { speed: 465, reaction: 0.10 }
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  class Game {
    constructor(difficulty, discovery, random = Math.random) {
      if (!Object.hasOwn(DIFFICULTIES, difficulty)) throw new Error("Difficulté invalide.");
      this.difficulty = DIFFICULTIES[difficulty];
      this.discovery = discovery;
      this.random = random;
      this.playerX = this.aiX = this.aiTarget = WIDTH / 2;
      this.playerScore = this.aiScore = this.rally = this.longest = this.returns = 0;
      this.reactionTimer = 0;
      this.state = "between";
      this.ball = { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0 };
    }

    movePlayer(x) {
      this.playerX = clamp(x, LEFT + PADDLE_WIDTH / 2, RIGHT - PADDLE_WIDTH / 2);
    }

    serve(direction = 1) {
      const speed = this.discovery ? 280 : 420;
      const vx = (this.random() - 0.5) * speed * 0.55;
      this.ball = { x: WIDTH / 2, y: HEIGHT / 2, vx, vy: direction * Math.sqrt(speed * speed - vx * vx) };
      this.rally = 0;
      this.state = "playing";
    }

    reflect(paddleX, direction) {
      const ball = this.ball;
      const offset = clamp((ball.x - paddleX) / (PADDLE_WIDTH / 2), -1, 1);
      const max = this.discovery ? 440 : 760;
      const speed = Math.min(max, Math.hypot(ball.vx, ball.vy) * 1.035);
      ball.vx = offset * speed * 0.72;
      ball.vy = direction * Math.sqrt(speed * speed - ball.vx * ball.vx);
      this.rally++;
      this.longest = Math.max(this.longest, this.rally);
    }

    step(dt) {
      if (this.state !== "playing" || !Number.isFinite(dt) || dt <= 0) return [];
      const events = [];
      const steps = Math.ceil(dt / (1 / 120));
      const interval = dt / steps;
      for (let i = 0; i < steps && this.state === "playing"; i++) this.tick(interval, events);
      return events;
    }

    tick(dt, events) {
      this.reactionTimer -= dt;
      if (this.reactionTimer <= 0) {
        this.aiTarget = this.ball.x;
        this.reactionTimer = this.difficulty.reaction;
      }
      const move = this.difficulty.speed * (this.discovery ? 0.8 : 1) * dt;
      this.aiX = clamp(this.aiX + clamp(this.aiTarget - this.aiX, -move, move), LEFT + PADDLE_WIDTH / 2, RIGHT - PADDLE_WIDTH / 2);
      const ball = this.ball, previousY = ball.y;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x < LEFT + RADIUS) { ball.x = 2 * (LEFT + RADIUS) - ball.x; ball.vx = Math.abs(ball.vx); }
      if (ball.x > RIGHT - RADIUS) { ball.x = 2 * (RIGHT - RADIUS) - ball.x; ball.vx = -Math.abs(ball.vx); }
      if (ball.vy > 0 && previousY <= PLAYER_Y - RADIUS && ball.y >= PLAYER_Y - RADIUS && Math.abs(ball.x - this.playerX) <= PADDLE_WIDTH / 2 + RADIUS) {
        ball.y = PLAYER_Y - RADIUS;
        this.reflect(this.playerX, -1);
        this.returns++;
        events.push("hit");
      } else if (ball.vy < 0 && previousY >= AI_Y + RADIUS && ball.y <= AI_Y + RADIUS && Math.abs(ball.x - this.aiX) <= PADDLE_WIDTH / 2 + RADIUS) {
        ball.y = AI_Y + RADIUS;
        this.reflect(this.aiX, 1);
        events.push("hit");
      }
      if (ball.y < -RADIUS || ball.y > HEIGHT + RADIUS) {
        const winner = ball.y < 0 ? "player" : "ai";
        if (winner === "player") this.playerScore++;
        else this.aiScore++;
        this.state = Math.max(this.playerScore, this.aiScore) >= 11 && Math.abs(this.playerScore - this.aiScore) >= 2 ? "finished" : "between";
        events.push(winner === "player" ? "player-point" : "ai-point");
        if (this.state === "finished") events.push("finished");
      }
    }
  }
  const api = { Game, WIDTH, HEIGHT, LEFT, RIGHT, PADDLE_WIDTH, PLAYER_Y, AI_Y, RADIUS, DIFFICULTIES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PingArcadeEngine = api;
})(globalThis);
