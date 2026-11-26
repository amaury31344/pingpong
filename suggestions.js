(function () {
  "use strict";
  const normalize = value => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const cityCache = new Map();
  const clubCache = new Map();

  async function json(url, controller) {
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Service indisponible (${response.status})`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }
  async function findCities(value, controller) {
    const query = value.trim();
    const key = normalize(query);
    if (cityCache.has(key)) return cityCache.get(key);
    const url = new URL("https://geo.api.gouv.fr/communes");
    url.searchParams.set(/^\d{5}$/.test(query) ? "codePostal" : "nom", query);
    url.searchParams.set("fields", "nom,code,codesPostaux,departement");
    url.searchParams.set("boost", "population");
    url.searchParams.set("limit", "10");
    const data = await json(url, controller);
    if (!Array.isArray(data)) throw new Error("Réponse de villes invalide");
    const rows = data.filter(row => typeof row.nom === "string" && row.nom.length <= 100 &&
      typeof row.code === "string" && /^[0-9A-Z]{5}$/.test(row.code) && Array.isArray(row.codesPostaux));
    cityCache.set(key, rows);
    return rows;
  }
  async function findClubs(code, controller) {
    const cached = clubCache.get(code);
    if (cached && Date.now() - cached.time < 5 * 60 * 1000) return cached.rows;
    const url = new URL("https://recherche-entreprises.api.gouv.fr/search");
    for (const [key, value] of Object.entries({
      q: "tennis de table", code_commune: code, est_association: "true",
      etat_administratif: "A", minimal: "true", per_page: "25"
    })) url.searchParams.set(key, value);
    const data = await json(url, controller);
    if (!Array.isArray(data.results)) throw new Error("Réponse de clubs invalide");
    const rows = [...new Set(data.results.map(item => item.nom_complet).filter(name =>
      typeof name === "string" && name.length <= 100 &&
      /\btennis[\s-]+(?:de[\s-]+)?table\b|\bping[\s-]?pong\b/.test(normalize(name))))]
      .sort((a, b) => a.localeCompare(b, "fr"));
    clubCache.set(code, { rows, time: Date.now() });
    return rows;
  }

  function dropdown(input, list, status, onSelect) {
    let rows = [], active = -1;
    function say(text, error = false) {
      status.textContent = text;
      status.classList.toggle("error", error);
    }
    function close() {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      active = -1;
    }
    function select(index) {
      if (!rows[index]) return;
      onSelect(rows[index]);
      close();
      input.focus();
    }
    function show(items) {
      rows = items;
      active = -1;
      list.replaceChildren();
      for (const [index, row] of rows.entries()) {
        const item = document.createElement("li");
        item.id = `${list.id}-${index}`;
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", "false");
        item.textContent = row.label;
        item.addEventListener("mousedown", event => event.preventDefault());
        item.addEventListener("click", () => select(index));
        list.append(item);
      }
      list.hidden = !rows.length || document.activeElement !== input;
      input.setAttribute("aria-expanded", String(!list.hidden));
      input.removeAttribute("aria-activedescendant");
    }
    input.addEventListener("keydown", event => {
      if (event.key === "Escape") { close(); return; }
      if (list.hidden || !rows.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        active = event.key === "ArrowDown" ? Math.min(active + 1, rows.length - 1) : Math.max(active - 1, 0);
        for (const [index, item] of [...list.children].entries()) item.setAttribute("aria-selected", String(index === active));
        input.setAttribute("aria-activedescendant", list.children[active].id);
        list.children[active].scrollIntoView({ block: "nearest" });
      } else if (event.key === "Enter" && active >= 0) {
        event.preventDefault();
        select(active);
      }
    });
    input.addEventListener("blur", close);
    return { say, close, show };
  }

  function cityField(prefix) {
    const input = document.querySelector(`#${prefix}-city`);
    const list = document.querySelector(`#${prefix}-city-options`);
    const status = document.querySelector(`#${prefix}-city-status`);
    let selected = null, revision = 0, controller = null, timer;
    const listeners = [];
    const ui = dropdown(input, list, status, row => {
      cancel();
      selected = row.city;
      input.value = row.city.nom;
      ui.say(`Ville choisie : ${row.label}.`);
      listeners.forEach(fn => fn());
    });
    function cancel() {
      revision++;
      clearTimeout(timer);
      controller?.abort();
      controller = null;
      ui.close();
    }
    async function search(version) {
      const query = input.value.trim();
      const request = new AbortController();
      controller = request;
      ui.say("Recherche des villes…");
      try {
        const cities = await findCities(query, request);
        if (version !== revision || input.value.trim() !== query) return;
        ui.show(cities.map(city => ({
          city, label: `${city.nom} · ${city.codesPostaux.join(", ")}${city.departement?.code ? ` · ${city.departement.code}` : ""}`
        })));
        ui.say(cities.length ? "Choisis une ville dans la liste ou continue à saisir librement." : "Aucune ville trouvée. Tu peux saisir librement.");
      } catch (error) {
        if (version === revision) ui.say("Suggestions de villes indisponibles. Tu peux saisir librement.", true);
      } finally { if (controller === request) controller = null; }
    }
    input.addEventListener("input", () => {
      cancel();
      selected = null;
      listeners.forEach(fn => fn());
      const query = input.value.trim();
      if (query.length < 2) { ui.say("Saisis au moins 2 caractères ou un code postal."); return; }
      const version = revision;
      timer = setTimeout(() => search(version), 400);
    });
    input.addEventListener("focus", () => {
      if (input.value.trim().length >= 2 && !selected) {
        cancel();
        const version = revision;
        timer = setTimeout(() => search(version), 400);
      }
    });
    input.form.addEventListener("reset", () => {
      cancel();
      selected = null;
      listeners.forEach(fn => fn());
    });
    async function resolve(request) {
      const value = input.value.trim();
      if (!value) throw new Error("Indique d’abord une ville.");
      if (selected && normalize(value) === normalize(selected.nom)) return selected;
      const cities = await findCities(value, request);
      const exact = cities.filter(city => /^\d{5}$/.test(value)
        ? city.codesPostaux.includes(value) : normalize(city.nom) === normalize(value));
      if (exact.length !== 1) throw new Error(exact.length ? "Plusieurs communes correspondent : choisis ta ville dans la liste." : "Ville non reconnue : choisis-la dans la liste ou saisis le club librement.");
      return exact[0];
    }
    return { input, resolve, subscribe: fn => listeners.push(fn) };
  }

  function clubField(prefix, city) {
    const input = document.querySelector(`#${prefix}-club`);
    const list = document.querySelector(`#${prefix}-club-options`);
    const status = document.querySelector(`#${prefix}-club-status`);
    let revision = 0, controller = null, clubs = null, loading = false;
    const ui = dropdown(input, list, status, row => {
      input.value = row.name;
      ui.say("Club choisi. Les résultats ne prouvent pas une affiliation FFTT.");
    });
    function cancel() {
      revision++;
      controller?.abort();
      controller = null;
      clubs = null;
      loading = false;
      ui.close();
    }
    function display() {
      const query = normalize(input.value);
      const rows = clubs.filter(name => !query || normalize(name).includes(query));
      ui.show(rows.map(name => ({ name, label: name })));
      ui.say(rows.length ? "Jusqu’à 25 associations, affiliation FFTT non vérifiée. Saisie libre possible." : "Aucun club proposé. Tu peux saisir librement.");
    }
    async function load() {
      if (loading) return;
      const version = revision, request = new AbortController();
      controller = request;
      loading = true;
      ui.say("Recherche des clubs…");
      try {
        const place = await city.resolve(request);
        const rows = await findClubs(place.code, request);
        if (version !== revision) return;
        clubs = rows;
        display();
      } catch (error) {
        if (version === revision) {
          const known = typeof error.message === "string" && /^(Indique|Plusieurs|Ville non reconnue|Service indisponible|Réponse de)/.test(error.message);
          const message = known ? error.message : "Suggestions indisponibles.";
          ui.say(`${message} Tu peux saisir le club librement.`, true);
        }
      } finally { if (version === revision) { loading = false; controller = null; } }
    }
    input.addEventListener("focus", () => clubs ? display() : load());
    input.addEventListener("input", () => { if (clubs) display(); else if (!loading) load(); });
    input.form.addEventListener("reset", cancel);
    city.subscribe(cancel);
  }

  const profileCity = cityField("profile");
  const playerCity = cityField("player");
  cityField("practice");
  clubField("profile", profileCity);
  clubField("player", playerCity);
  clubField("directory", profileCity);
})();
