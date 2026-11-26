"use strict";

(function () {
  const engine = PingArcadeEngine;
  const canvas = document.querySelector("#arcade-canvas");
  const ctx = canvas.getContext("2d");
  const difficulty = document.querySelector("#arcade-difficulty");
  const mode = document.querySelector("#arcade-mode");
  const control = document.querySelector("#arcade-control");
  const discovery = document.querySelector("#arcade-discovery");
  const sound = document.querySelector("#arcade-sound");
  const start = document.querySelector("#arcade-start");
  const pause = document.querySelector("#arcade-pause");
  const quit = document.querySelector("#arcade-quit");
  const status = document.querySelector("#arcade-status");
  const touch = document.querySelector("#arcade-touch");
  const record = document.querySelector("#arcade-record");
  const keys = new Set();
  let game = null, state = "idle", previous = 0, countdown = 0, announced = "", animation = 0, audio = null;
  if (window.matchMedia("(pointer: coarse)").matches) control.value = "touch";

  const recordKey = () => `v1:${difficulty.value}:${control.value}:${discovery.checked ? "discovery" : "standard"}`;
  const arcadeVisible = () => !document.querySelector("#arcade").hidden && !document.hidden;
  function message(text) { if (status.textContent !== text) status.textContent = text; }
  function recordText() { record.textContent = mode.value === "coop" ? `Meilleur échange de cette partie : ${game?.cooperative ? game.longest : 0} renvoi(s), non sauvegardé.` : `Record personnel pour ces réglages : ${PingApp.getRecord(recordKey())} renvoi(s) dans un échange`; }
  function controls() {
    const ongoing = ["playing", "countdown", "paused"].includes(state);
    mode.disabled = discovery.disabled = ongoing;
    difficulty.disabled = control.disabled = ongoing || mode.value === "coop";
    document.querySelector("#arcade-coop-help").hidden = mode.value !== "coop";
    start.disabled = ongoing;
    pause.disabled = !ongoing;
    quit.disabled = !ongoing;
    pause.textContent = state === "paused" ? "Reprendre" : "Pause";
    touch.hidden = mode.value === "coop" || control.value !== "touch";
    document.querySelector("#arcade-opponent-label").textContent = mode.value === "coop" ? "MEILLEUR" : "ORDINATEUR";
    document.querySelector("#arcade-player-label").textContent = mode.value === "coop" ? "ÉCHANGE" : "TOI";
    document.querySelector("#arcade-score-label").textContent = mode.value === "coop" ? "RENVOIS ENSEMBLE" : "À 11 POINTS · 2 D’ÉCART";
  }
  function score() {
    document.querySelector("#arcade-player-score").textContent = game?.cooperative ? game.rally : game?.playerScore ?? 0;
    document.querySelector("#arcade-opponent-score").textContent = game?.cooperative ? game.longest : game?.aiScore ?? 0;
  }
  function beep(frequency) {
    if (!sound.checked || !audio || audio.state !== "running") return;
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = "sine"; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.06);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime + 0.06);
  }
  function saveBest() {
    if (!game || game.cooperative || game.longest <= PingApp.getRecord(recordKey())) return true;
    const saved = PingApp.saveRecord(recordKey(), game.longest);
    recordText();
    return saved;
  }
  function finish() {
    state = "finished"; keys.clear();
    const saved = saveBest();
    controls(); score();
    message(`${game.playerScore > game.aiScore ? "Victoire" : "Défaite"} ${game.playerScore} à ${game.aiScore}. Plus long échange : ${game.longest} renvoi(s). Tes renvois réussis : ${game.returns}.${saved ? "" : " Record non enregistré sur cet appareil."}`);
  }
  function startCountdown(text) {
    state = "countdown"; countdown = 3; announced = ""; previous = 0;
    message(text); controls(); startLoop();
  }
  function pauseGame(reason = "Partie en pause.") {
    if (!["playing", "countdown"].includes(state)) return;
    state = "paused"; keys.clear(); previous = 0; controls();
    message(`${reason} Appuie sur Reprendre pour relancer le compte à rebours.`);
    draw();
  }
  function startLoop() {
    if (!animation && arcadeVisible()) animation = requestAnimationFrame(frame);
  }
  function frame(now) {
    animation = 0;
    if (!arcadeVisible()) return;
    const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
    previous = now;
    if (state === "countdown") {
      countdown -= dt;
      const current = Math.ceil(countdown);
      if (current > 0 && current !== announced) { announced = current; message(`Reprise dans ${current}…`); }
      if (countdown <= 0) {
        if (game.state === "between") {
          game.serve(game.playerScore + game.aiScore === 0 ? 1 : (game.playerScore + game.aiScore) % 2 ? -1 : 1);
          score();
        }
        state = "playing"; message("Échange en cours.");
      }
    } else if (state === "playing") {
      if (mode.value === "coop" || control.value === "keyboard") {
        const direction = Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft"));
        game.movePlayer(game.playerX + direction * 700 * dt);
      }
      if (game.cooperative) {
        const direction = Number(keys.has("d")) - Number(keys.has("a"));
        game.movePartner(game.aiX + direction * 700 * dt);
      }
      const events = game.step(dt);
      if (events.includes("hit")) { beep(470); if (game.cooperative) { score(); recordText(); } }
      if (events.includes("rally-end")) {
        beep(250); score(); recordText();
        startCountdown(`Échange terminé : ${game.rally} renvoi(s). Recommencez ensemble.`);
      }
      if (events.includes("player-point") || events.includes("ai-point")) {
        beep(250); score();
        if (events.includes("finished")) finish();
        else startCountdown("Point marqué. Nouvel échange.");
      }
    }
    draw();
    if (["playing", "countdown"].includes(state)) startLoop();
    else previous = 0;
  }
  function draw() {
    const { WIDTH: w, HEIGHT: h, LEFT: left, RIGHT: right, PADDLE_WIDTH: pw, PLAYER_Y: py, AI_Y: ay } = engine;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#102a40"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#286c77"; ctx.fillRect(left - 8, 35, right - left + 16, h - 70);
    ctx.fillStyle = "#19576b"; ctx.fillRect(left, 45, right - left, h - 90);
    ctx.strokeStyle = "#e3f4ed"; ctx.lineWidth = 5; ctx.strokeRect(left, 45, right - left, h - 90);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w / 2, 45); ctx.lineTo(w / 2, h - 45); ctx.stroke();
    ctx.fillStyle = "#d4e5e2"; ctx.fillRect(left - 5, h / 2 - 7, right - left + 10, 14);
    ctx.fillStyle = "#91afaf"; ctx.fillRect(left - 5, h / 2 + 5, right - left + 10, 7);
    const gx = game?.playerX ?? w / 2, ax = game?.aiX ?? w / 2;
    ctx.fillStyle = "#f4b65b"; ctx.beginPath(); ctx.roundRect(ax - pw / 2, ay - 10, pw, 20, 10); ctx.fill();
    ctx.fillStyle = "#86e1c2"; ctx.beginPath(); ctx.roundRect(gx - pw / 2, py - 10, pw, 20, 10); ctx.fill();
    const b = game?.ball ?? { x: w / 2, y: h / 2 + 100 };
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.arc(b.x + 5, b.y + 7, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI * 2); ctx.fill();
  }
  start.addEventListener("click", () => {
    if (!arcadeVisible()) return;
    game = new engine.Game(difficulty.value, discovery.checked, Math.random, mode.value === "coop");
    score(); recordText(); startCountdown("Prépare-toi.");
  });
  pause.addEventListener("click", () => {
    if (state === "paused") startCountdown("Reprise.");
    else pauseGame();
  });
  quit.addEventListener("click", () => {
    if (!game) return;
    const saved = saveBest();
    state = "idle"; keys.clear(); controls();
    message(`Partie quittée. Plus long échange : ${game.longest} renvoi(s).${saved ? "" : " Record non enregistré sur cet appareil."}`);
    draw();
  });
  [difficulty, control, discovery, mode].forEach(field => field.addEventListener("change", () => { game = null; controls(); score(); recordText(); draw(); }));
  sound.addEventListener("change", () => {
    if (!sound.checked) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) { sound.checked = false; message("Son indisponible sur ce navigateur."); return; }
    try {
      audio ||= new AudioContext();
      audio.resume().catch(() => { sound.checked = false; message("Le son n’a pas pu être activé."); });
    } catch (error) {
      sound.checked = false;
      message(`Le son n’a pas pu être activé : ${error.message}`);
    }
  });
  document.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (!arcadeVisible() || (mode.value !== "coop" && control.value !== "keyboard") || !["playing", "countdown"].includes(state) || !["arrowleft", "arrowright", ...(mode.value === "coop" ? ["a", "d"] : [])].includes(key)) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;
    event.preventDefault(); keys.add(key === "arrowleft" ? "ArrowLeft" : key === "arrowright" ? "ArrowRight" : key);
  });
  document.addEventListener("keyup", event => keys.delete(event.key.toLowerCase() === "arrowleft" ? "ArrowLeft" : event.key.toLowerCase() === "arrowright" ? "ArrowRight" : event.key.toLowerCase()));
  window.addEventListener("blur", () => pauseGame("Fenêtre inactive."));
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame("Application en arrière-plan."); });
  window.addEventListener("hashchange", () => {
    if (location.hash !== "#arcade") pauseGame("Tu as quitté le jeu.");
    else { draw(); recordText(); startLoop(); }
  });
  window.addEventListener("ping-data-restored", recordText);
  canvas.addEventListener("pointermove", event => {
    if (game && !game.cooperative && control.value === "mouse" && event.pointerType === "mouse" && state === "playing") {
      const bounds = canvas.getBoundingClientRect();
      game.movePlayer((event.clientX - bounds.left) / bounds.width * engine.WIDTH);
    }
  });
  function moveTouch(event) {
    if (!game || control.value !== "touch" || !["playing", "countdown"].includes(state)) return;
    const bounds = touch.getBoundingClientRect();
    game.movePlayer((event.clientX - bounds.left) / bounds.width * engine.WIDTH);
  }
  touch.addEventListener("pointerdown", event => { if (control.value === "touch") { event.preventDefault(); touch.setPointerCapture(event.pointerId); moveTouch(event); } });
  touch.addEventListener("pointermove", event => { if (touch.hasPointerCapture(event.pointerId)) moveTouch(event); });
  controls(); recordText(); draw();
})();
