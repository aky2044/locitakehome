(() => {
  "use strict";

  /* ---------- data ---------- */
  const MODELS = {
    bonsai: { title: "Best all round", desc: "Excellent writing and reasoning",          name: "Bonsai 2 4B",               dlName: "Bonsai 2 4b", size: 1.55, logo: `<span class="logo-bonsai"></span>` },
    phi:    { title: "Coding",         desc: "Writes, explains, and fixes code",         name: "Phi-4 Mini Reasoning 3.8B", size: 2.83, logo: `<img class="logo-phi" src="assets/logo-phi.png" alt="">`, tile: "photo" },
    qwen:   { title: "Deep thinking",  desc: "Works through hard, multi-step problems",  name: "Qwen 3.5 4B",               size: 3.75, logo: `<img class="logo-qwen" src="assets/logo-qwen.png" alt="">`, bigOnly: true },
    gemma:  { title: "Photos",         desc: "Understands pictures you add",             name: "Gemma 4 E2B",               size: 4.43, logo: `<img class="logo-gemma" src="assets/logo-gemma.png" alt="">`, bigOnly: true },
  };
  // bigOnly: the two largest models get a red "not enough space" note in the low-storage state
  const AVAIL_GB = 1.6, AVAIL_LOW_GB = 1.05;   // free space normally / in the low-storage state (Figma 45:23)
  const CARD_TOPS = [157, 292, 427, 562]; // Figma 4:36, 4:37, 4:45, 4:50

  const MESSAGES = [
    ["Help make AI greener.", "A single cloud-AI query uses about 10x the electricity of a web search. With a local model, Loci runs entirely on this Mac: no data centers, no extra water use."],
    ["Your conversations stay yours", "Unlike cloud-based AI, Loci runs your model directly on your computer, so your chats don't need to be sent to a server for processing"],
    ["No Wi-Fi? No problem.", "Once your model is downloaded, you can chat with Loci even without internet"],
    ["An AI for every occasion.", "Explore different models whenever you like. Each has its own strengths, and you can switch between them as your needs change."],
  ];

  /* ---------- fill the window, keeping the 1280×832 Mac layout ---------- */
  const FRAME_W = 1280, FRAME_H = 832;
  const stage = document.getElementById("stage");
  const framed = document.documentElement.classList.contains("framed");
  const macWin = document.querySelector(".mac-window");
  function fit() {
    if (framed) {
      // normal browser tab: a 1280×832 Mac window (plus title bar), centred and scaled to fit
      const TB = 28, M = innerWidth < 700 ? 8 : 40;
      const s = Math.min((innerWidth - 2 * M) / FRAME_W, (innerHeight - 2 * M - TB) / FRAME_H, 1);
      const w = FRAME_W * s, h = FRAME_H * s;
      const x = Math.round((innerWidth - w) / 2), y = Math.round((innerHeight - h - TB) / 2);
      Object.assign(macWin.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h + TB}px` });
      stage.style.width = `${FRAME_W}px`;
      stage.style.height = `${FRAME_H}px`;
      stage.style.transform = `translate(${x}px, ${y + TB}px) scale(${s})`;
      stage.style.setProperty("--fx", "0px");
      stage.style.setProperty("--fy", "0px");
      return;
    }
    const s = Math.min(innerWidth / FRAME_W, innerHeight / FRAME_H);
    const W = innerWidth / s, H = innerHeight / s;       // window size in design px
    stage.style.width = `${W}px`;
    stage.style.height = `${H}px`;
    stage.style.transform = `scale(${s})`;
    stage.style.setProperty("--fx", `${(W - FRAME_W) / 2}px`);
    stage.style.setProperty("--fy", `${(H - FRAME_H) / 2}px`);
  }
  addEventListener("resize", fit);
  fit();

  // Installed app (PWA): open at the Figma Mac window size, once per launch
  if (matchMedia("(display-mode: standalone)").matches) {
    try {
      if (!sessionStorage.getItem("loci-sized")) {
        sessionStorage.setItem("loci-sized", "1");
        resizeTo(FRAME_W + (outerWidth - innerWidth), FRAME_H + (outerHeight - innerHeight));
      }
    } catch (_) {}
  }
  // service worker → Chrome / Edge offer "Install Loci" (needs https or localhost)
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  const screens = Object.fromEntries(
    [...document.querySelectorAll(".screen")].map((el) => [el.dataset.screen, el])
  );

  /* ---------- v1 option cards (same layout as Figma card 4:36) ---------- */
  const optionsEl = document.getElementById("options");
  Object.entries(MODELS).forEach(([key, m], i) => {
    const o = document.createElement("div");
    o.className = "option";
    o.style.top = `${CARD_TOPS[i]}px`;
    o.dataset.model = key;
    o.setAttribute("role", "radio");
    o.setAttribute("aria-checked", "false");
    o.tabIndex = 0;
    o.innerHTML = `
      <span class="opt-logo${m.tile === "photo" ? " opt-logo--photo" : ""}">${m.logo}</span>
      <span class="opt-border"></span>
      <img class="opt-radio" src="assets/radio.svg" width="20" height="20" alt="">
      <span class="opt-dot"></span>
      <p class="opt-title"></p><p class="opt-desc"></p><p class="opt-meta"></p>
      ${m.bigOnly ? `<p class="opt-nospace">Not enough space on this Mac</p>` : ""}`;
    o.querySelector(".opt-title").textContent = m.title;
    o.querySelector(".opt-desc").textContent = m.desc;
    o.querySelector(".opt-meta").textContent = `${m.name} • ${m.size} GB`;
    optionsEl.appendChild(o);
  });
  const options = [...optionsEl.children];

  /* ---------- navigation ---------- */
  const state = { screen: "home", setupVariant: "v2", chosen: "bonsai", selected: "bonsai", lowStorage: false };
  const pageOf = (name) => Number(screens[name].dataset.page);

  function go(name) {
    if (name === state.screen) return;
    const from = screens[state.screen], to = screens[name];
    const dir = pageOf(name) >= pageOf(state.screen) ? 1 : -1;

    to.style.setProperty("--from", `${40 * dir}px`);
    to.style.transition = "none";
    to.classList.remove("is-leaving");
    void to.offsetWidth;
    to.style.transition = "";

    from.style.setProperty("--to", `${-40 * dir}px`);
    from.classList.add("is-leaving");
    from.classList.remove("is-active");
    to.classList.add("is-active");

    if (name === "v1" || name === "v2") state.setupVariant = name;
    if (name === "v1") {   // open the list with the model currently on the card already selected
      const cur = options.find((o) => o.dataset.model === state.chosen);
      if (cur) select(cur);
    }
    state.screen = name;
    stage.classList.toggle("on-dark", name === "download");
    stage.classList.toggle("on-chat", name === "chat");

    // background video plays only while the download screen is visible
    const video = document.querySelector("video.dl-bg");
    if (name === "download") video.play().catch(() => {});
    else video.pause();
    renderPageControl();
  }

  // resume the background video when the window comes back into view (browsers pause it while hidden)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.screen === "download") {
      document.querySelector("video.dl-bg").play().catch(() => {});
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "b" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (state.screen !== "download" || !download.started || download.done) return;
    messages.toggleMode();
  });

  /* ---------- Light / dark theme: N toggles (no on-screen hint), remembered per browser ---------- */
  try { if (localStorage.getItem("loci-theme") === "dark") document.body.classList.add("theme-dark"); } catch (_) {}
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const dark = document.body.classList.toggle("theme-dark");
    try { localStorage.setItem("loci-theme", dark ? "dark" : "light"); } catch (_) {}
  });

  /* ---------- Hidden dev key P: toggle the "not enough storage" state (no on-screen hint) ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "p" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    setLowStorage(!state.lowStorage);
  });

  function setLowStorage(v) {
    state.lowStorage = v;
    stage.classList.toggle("low-storage", v);
    renderChosen();
  }
  // In the low-storage state the recommended Bonsai and the two red-flagged models don't fit;
  // picking a model without a red note (e.g. Phi-4 Mini) lets you continue.
  const noSpace = () => state.lowStorage && (state.chosen === "bonsai" || !!MODELS[state.chosen].bigOnly);

  screens.download.addEventListener("click", (e) => {
    if (e.target.closest("button, a, .page-control, .dl-card")) return;   // real controls keep their own behaviour
    if (state.screen === "download" && download.started && !download.done) messages.skip();
  });

  function startDownload(model) {
    if (noSpace()) return;                 // Next is disabled: not enough space
    download.start(model);
    conn.onStart();
    go("download");
  }

  // page-control navigation: never starts a download the user hasn't chosen
  function goPage(i) {
    if (i === 0) return go("home");
    if (i === 1) return go(state.setupVariant);
    if (download.started) return go("download");
    if (noSpace()) return;                 // same as the disabled Next button
    return startDownload(state.chosen);
    // v1 with nothing selected: stay put, like the disabled Next button
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go], [data-action]");
    if (!t || t.disabled) return;
    if (t.dataset.go) return go(t.dataset.go);
    if (t.dataset.action === "download-recommended") return startDownload(state.chosen);
    if (t.dataset.action === "open-storage") return setLowStorage(false);   // "freed up space" -> normal screen
    if (t.dataset.action === "save-model") { state.chosen = state.selected; renderChosen(); return go("v2"); }
  });

  /* ---------- Recommended-model card (v2): shows whichever model is chosen ---------- */
  const BADGES = { bonsai: "Best all-round" };   // other models show their strength as the label
  function renderChosen() {
    const key = state.chosen, m = MODELS[key];
    const card = document.getElementById("model-card");
    card.classList.toggle("is-placeholder", key !== "bonsai");   // no artwork yet → low-fi grey card
    card.setAttribute("aria-label", `${key === "bonsai" ? "Recommended" : "Chosen"} model: ${m.name}`);
    document.getElementById("mc-recommended").textContent = key === "bonsai" ? "Recommended for you" : "Your choice";
    document.getElementById("mc-badge-text").textContent = BADGES[key] || m.title;
    document.getElementById("mc-desc").textContent = m.desc;
    const size = document.getElementById("mc-size");
    size.textContent = `${m.size} GB`;
    // not-enough-space state: notice in the card, Next disabled, Open Storage Settings shown
    const low = noSpace();
    stage.classList.toggle("no-space", low);
    document.getElementById("mc-avail").textContent = `${low ? AVAIL_LOW_GB : AVAIL_GB} GB available`;
    const need = Math.max(0.01, Number((m.size - AVAIL_LOW_GB).toFixed(2)));
    document.getElementById("mc-error-title").textContent = `You need ${need} GB more space.`;
    document.getElementById("mc-error").setAttribute("aria-hidden", String(!low));
    document.getElementById("v2-next").disabled = low;
    document.querySelector(".btn-storage").tabIndex = low ? 0 : -1;
    // "1.6 GB available" sits 10px after the size, whatever its width (Figma: 726 + 128 + 10 = 864)
    document.getElementById("mc-avail").style.left = `${726 + size.offsetWidth + 10}px`;
    const name = document.getElementById("mc-name");
    name.textContent = m.name;
    // long names (e.g. "Phi-4 Mini Reasoning 3.8B") shrink to fit inside the card
    name.style.fontSize = "";
    let px = 48;
    while (name.scrollWidth > 368 && px > 26) { px -= 1; name.style.fontSize = `${px}px`; }
  }
  document.fonts && document.fonts.ready.then(renderChosen);

  /* ---------- v1 radio group ---------- */
  function select(opt) {
    options.forEach((o) => o.setAttribute("aria-checked", String(o === opt)));
    state.selected = opt.dataset.model;
  }
  options.forEach((o, i) => {
    o.addEventListener("click", () => select(o));
    o.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); select(o); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = options[(i + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length];
        n.focus(); select(n);
      }
    });
  });

  /* ---------- Page control (modelled on UIPageControl) ----------
     • Tap/click: moves ONE page toward the side of the current indicator you tapped.
     • Press-and-drag (scrub): the current page follows the pointer across the indicators.
     • Keyboard (when focused): ←/→ move one page, Home/End jump to first/last.        */
  const pc = document.getElementById("page-control");
  const dots = [...pc.querySelectorAll(".pc-dot")];
  const current = () => pageOf(state.screen);

  function renderPageControl() {
    dots.forEach((d, i) => {
      const on = i === current();
      d.classList.toggle("is-current", on);
      d.setAttribute("aria-selected", String(on));
    });
  }
  renderPageControl();

  const indexAt = (clientX) => {
    let best = 0, bestDist = Infinity;
    dots.forEach((d, i) => {
      const r = d.getBoundingClientRect();
      const dist = Math.abs(clientX - (r.left + r.width / 2));
      if (dist < bestDist) { best = i; bestDist = dist; }
    });
    return best;
  };

  let press = null;
  pc.addEventListener("pointerdown", (e) => {
    press = { x: e.clientX, scrubbing: false };
    pc.setPointerCapture(e.pointerId);
    pc.classList.add("is-pressed");
  });
  pc.addEventListener("pointermove", (e) => {
    if (!press) return;
    if (!press.scrubbing && Math.abs(e.clientX - press.x) > 4) press.scrubbing = true;
    if (press.scrubbing) {
      const i = indexAt(e.clientX);
      if (i !== current()) goPage(i);
    }
  });
  const endPress = (e, cancelled) => {
    if (!press) return;
    if (!press.scrubbing && !cancelled) {
      const cur = dots[current()].getBoundingClientRect();
      const next = e.clientX > cur.left + cur.width / 2 ? current() + 1 : current() - 1;
      if (next >= 0 && next < dots.length) goPage(next);
    }
    press = null;
    pc.classList.remove("is-pressed");
  };
  pc.addEventListener("pointerup", (e) => endPress(e, false));
  pc.addEventListener("pointercancel", (e) => endPress(e, true));
  pc.addEventListener("keydown", (e) => {
    const map = { ArrowRight: current() + 1, ArrowLeft: current() - 1, Home: 0, End: dots.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const i = Math.max(0, Math.min(dots.length - 1, map[e.key]));
    if (i !== current()) goPage(i);
  });

  /* ---------- Rotating message on the download screen ---------- */
  const messages = (() => {
    const box = document.getElementById("dl-message");
    const title = document.getElementById("dl-title");
    const body = document.getElementById("dl-body");
    const cont = document.getElementById("dl-continue");
    const section = screens.download;
    const cards = document.getElementById("dl-cards");
    const cardContent = document.getElementById("dlc-content");
    const cardCount = document.getElementById("dlc-count");
    const cardTitle = document.getElementById("dlc-title");
    const cardBody = document.getElementById("dlc-body");
    const cardNext = document.getElementById("dlc-next");
    const dotsEl = document.getElementById("dlc-dots");
    const dots = MESSAGES.map((_, k) => {
      const d = document.createElement("button");
      d.className = "dlc-dot"; d.setAttribute("aria-label", `Card ${k + 1}`);
      d.addEventListener("click", () => showCard(k));
      dotsEl.appendChild(d);
      return d;
    });
    const retry = document.getElementById("dl-retry");
    let i = 0, timer = 0, swap = 0, mode = "text", card = 0, cardSwap = 0, finished = false, held = false;

    function renderCard() {
      cardCount.textContent = `${card + 1} of ${MESSAGES.length}`;
      [cardTitle.textContent, cardBody.textContent] = MESSAGES[card];
      dots.forEach((d, k) => d.classList.toggle("is-current", k === card));
    }
    function showCard(k) {
      k = (k + MESSAGES.length) % MESSAGES.length;
      if (k === card) return;
      card = k;
      cardContent.classList.add("is-out");
      clearTimeout(cardSwap);
      cardSwap = setTimeout(() => { renderCard(); cardContent.classList.remove("is-out"); }, 260);
    }
    document.getElementById("dlc-back").addEventListener("click", () => showCard(card - 1));
    cardNext.addEventListener("click", () => showCard(card + 1));
    cards.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") showCard(card + 1);
      if (e.key === "ArrowLeft") showCard(card - 1);
    });
    const startRotation = () => {
      clearInterval(timer);
      timer = setInterval(() => { i = (i + 1) % MESSAGES.length; show(...MESSAGES[i]); }, 7000);
    };
    function setMode(m) {
      mode = m;
      section.classList.toggle("mode-cards", m === "cards");
      cards.setAttribute("aria-hidden", String(m !== "cards"));
      if (m === "cards") clearInterval(timer);   // cards only move when the user clicks
      else if (!finished && !held) startRotation();
    }
    const show = (t, b, after) => {
      box.classList.add("is-hidden");
      clearTimeout(swap);
      swap = setTimeout(() => {
        title.textContent = t; body.textContent = b;
        box.classList.remove("is-hidden");
        if (after) after();
      }, 700); // matches the CSS fade
    };
    return {
      get mode() { return mode; },
      toggleMode() { if (!finished) setMode(mode === "text" ? "cards" : "text"); },
      // paused / offline / resumed: a fixed status message replaces the facts (and the cards)
      hold(t, b, withRetry) {
        if (finished) return;
        held = true;
        clearInterval(timer);
        section.classList.add("is-held");
        retry.classList.remove("is-shown"); retry.tabIndex = -1;
        show(t, b, () => {
          if (!withRetry) return;
          retry.style.top = `${body.offsetTop + body.offsetHeight + 26}px`;   // just under the message
          retry.classList.add("is-shown"); retry.tabIndex = 0;
        });
      },
      release() {
        if (!held || finished) return;
        held = false;
        section.classList.remove("is-held");
        retry.classList.remove("is-shown"); retry.tabIndex = -1;
        show(...MESSAGES[i]);
        if (mode === "text") startRotation();
      },
      // click anywhere while downloading → next fun fact now (rotation timer restarts)
      skip() {
        if (finished || held) return;
        if (mode === "cards") return showCard(card + 1);
        i = (i + 1) % MESSAGES.length;
        show(...MESSAGES[i]);
        startRotation();
      },
      start() {
        clearInterval(timer);
        i = 0; card = 0; finished = false; held = false;
        renderCard();
        section.classList.remove("is-done", "is-held");
        retry.classList.remove("is-shown"); retry.tabIndex = -1;
        cont.classList.remove("is-shown"); cont.tabIndex = -1;
        box.classList.remove("is-ready");
        // first message appears instantly (no fade-out/in on entering the screen)
        clearTimeout(swap);
        [title.textContent, body.textContent] = MESSAGES[0];
        box.classList.remove("is-hidden");
        if (mode === "text") startRotation();
      },
      // download finished: "<Model> is ready" + Continue button
      ready(name) {
        clearInterval(timer);
        finished = true; held = false;
        section.classList.remove("is-held");
        section.classList.add("is-done");   // both modes end on the same "<model> is ready" screen
        show(`${name} is ready.`, "");
        document.getElementById("chat-model").textContent = name;
        setTimeout(() => {
          box.classList.add("is-ready");
          cont.classList.add("is-shown"); cont.tabIndex = 0;
        }, 700);
      },
    };
  })();

  /* ---------- Simulated model download (~30 seconds) ----------
     Throughput moves through "phases" (slow / normal / fast bursts, 1.2–3.5 s each),
     with jitter and the odd brief stall, but is continuously steered so the whole
     download lands at ~30 s. Add ?speed=10 to the URL to run it 10× faster.      */
  const download = (() => {
    const speed = Math.max(0.1, Number(new URLSearchParams(location.search).get("speed")) || 1);
    const TARGET_S = 30 / speed;   // ~30 seconds end to end

    const el = {
      model: document.getElementById("dl-model"),
      eta: document.getElementById("dl-eta"),
      fill: document.getElementById("dl-fill"),
      bar: document.getElementById("dl-bar"),
      top: document.getElementById("dl-top-progress"),
      amount: document.getElementById("dl-amount"),
      hint: document.getElementById("dl-hint"),
    };

    let model = null, total = 0, done = false, timer = 0, pausedAt = 0;
    let got, t0, last, mult, phaseMult, phaseUntil, stallUntil, lastEtaUpdate;

    const fmt = (gb) => (gb === 0 ? "0" : gb.toFixed(2));
    const rand = (a, b) => a + Math.random() * (b - a);

    function etaText(sec) {
      sec *= speed; // describe it in real-world terms even when sped up
      if (sec >= 90) return `About ${Math.round(sec / 60)} minutes left`;
      if (sec >= 45) return "About a minute left";
      if (sec >= 10) return "Less than a minute left";
      return "A few seconds left";
    }

    function newPhase(now) {
      const r = Math.random();
      phaseMult = r < 0.25 ? rand(0.25, 0.6)      // slow patch
                : r < 0.70 ? rand(0.8, 1.2)       // steady
                :            rand(1.4, 2.2);      // fast burst
      phaseUntil = now + rand(1200, 3500) / speed;   // 1.2–3.5 s phases
    }

    function render(now) {
      const p = got / total;
      const pct = Math.floor(p * 100);
      const name = MODELS[model].dlName || MODELS[model].name;
      el.model.textContent = name;
      el.fill.style.width = `${(p * 100).toFixed(3)}%`;
      el.bar.setAttribute("aria-valuenow", String(pct));
      el.top.textContent = `${fmt(got)}/${total}GB (${pct}%)`;
      el.amount.textContent = `${fmt(got)} of ${total}GB`;
      if (done) {
        el.eta.textContent = "Download complete";
        document.querySelector(".dl-top-1").textContent = "Model downloaded";
        el.hint.textContent = `${name} is ready`;
      } else if (now - lastEtaUpdate > 1000 / speed) {
        // The run is steered to finish at TARGET_S, so the true time left only counts
        // down; bursts and slow patches show in the bar, not as a jumpy estimate.
        el.eta.textContent = etaText(Math.max(0, TARGET_S - (now - t0) / 1000));
        lastEtaUpdate = now;
      }
    }

    function tick() {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 2);
      last = now;
      const elapsed = (now - t0) / 1000;

      if (now > phaseUntil) newPhase(now);
      // ease toward the phase's speed (~1 s real-time), plus small jitter
      mult += (phaseMult - mult) * Math.min(1, dt * speed * 1.2);
      const jitter = rand(0.9, 1.1);

      if (now > stallUntil && Math.random() < dt / (14 / speed)) {   // a stall roughly every 14 s
        stallUntil = now + rand(500, 1200) / speed;
      }
      const stalled = now < stallUntil;

      const remaining = total - got;
      const timeLeft = Math.max(TARGET_S - elapsed, 4 / speed);
      let rate = (remaining / timeLeft) * mult * jitter;
      rate = Math.min(rate, (total / TARGET_S) * 3);
      // floor: never slower than 35% of the average pace (otherwise "remaining / timeLeft"
      // decays exponentially near the end and the bar creeps at 99% forever)
      rate = Math.max(rate, (total / TARGET_S) * 0.35);
      if (stalled && elapsed < TARGET_S * 0.9) rate *= 0.03;   // no stalls in the final stretch

      got = Math.min(total, got + rate * dt);

      if (got >= total - 0.001) {
        got = total; done = true; clearInterval(timer);
        messages.ready(MODELS[model].name);
      }
      render(now);
    }

    return {
      get started() { return model !== null; },
      get done() { return done; },
      // pause/resume keep the bytes already downloaded; the finish time shifts by the paused time
      pause() {
        if (!model || done || pausedAt) return;
        clearInterval(timer);
        pausedAt = performance.now();
      },
      resume() {
        if (!pausedAt) return;
        const now = performance.now(), d = now - pausedAt;
        t0 += d; phaseUntil += d; stallUntil += d;
        last = now; lastEtaUpdate = 0; pausedAt = 0;
        render(now);                          // time-left estimate comes straight back
        timer = setInterval(tick, 250);
      },
      start(key) {
        if (key === model) return;            // already downloading / downloaded this one
        clearInterval(timer);
        model = key; total = MODELS[key].size; done = false; pausedAt = 0;
        got = 0; mult = 1; stallUntil = 0;
        t0 = last = performance.now();
        newPhase(t0);
        lastEtaUpdate = t0;
        el.hint.textContent = "You may minimize Loci";
        document.querySelector(".dl-top-1").textContent = "Downloading your model";
        render(t0);
        el.eta.textContent = etaText(TARGET_S);
        timer = setInterval(tick, 250);
        messages.start();
      },
    };
  })();

  /* ---------- Pause button + lost connection ----------
     • Pause (button above the bar): "Download paused / We'll wait for you to resume."
     • Offline (real network events, or hidden dev key W): "Download paused / Your internet
       connection was lost…" + Try again; top right "Waiting for connection".
     • Back online: "Download resumed" for a few seconds, then the facts carry on.      */
  const conn = (() => {
    const section = screens.download;
    const pauseBtn = document.getElementById("dl-pause");
    const retry = document.getElementById("dl-retry");
    const top1 = document.querySelector(".dl-top-1");
    const eta = document.getElementById("dl-eta");
    let userPaused = false, simOffline = false, offline = false, resumeTimer = 0;
    const isOnline = () => navigator.onLine && !simOffline;
    const active = () => download.started && !download.done;

    function apply(reconnected) {
      section.classList.toggle("is-paused", userPaused && !offline);
      section.classList.toggle("is-offline", offline);
      pauseBtn.setAttribute("aria-label", userPaused ? "Resume download" : "Pause download");
      if (!active()) return;
      clearTimeout(resumeTimer);
      if (offline) {
        download.pause();
        top1.textContent = "Waiting for connection";
        eta.textContent = "Time remaining unavailable";
        messages.hold("Download paused", "Your internet connection was lost, we’ll resume when you’re back online.", true);
      } else if (userPaused) {
        download.pause();
        top1.textContent = "Download paused";
        eta.textContent = "Paused";
        messages.hold("Download paused", "We’ll wait for you to resume.");
      } else {
        top1.textContent = "Downloading your model";
        download.resume();
        if (reconnected) {
          messages.hold("Download resumed", "You’re picking up where you left off.");
          resumeTimer = setTimeout(() => messages.release(), 3800);
        } else {
          messages.release();
        }
      }
    }
    function setOffline(v) {
      if (v === offline) return;
      const was = offline;
      offline = v;
      apply(was && !v);
    }

    pauseBtn.addEventListener("click", () => {
      if (!active() || offline) return;
      userPaused = !userPaused;
      apply(false);
    });
    retry.addEventListener("click", () => {
      retry.classList.add("is-checking");     // spin the icon while we "check" the connection
      setTimeout(() => {
        retry.classList.remove("is-checking");
        if (isOnline()) setOffline(false);
      }, 900);
    });
    addEventListener("online", () => setOffline(!isOnline()));
    addEventListener("offline", () => setOffline(true));
    // hidden dev key: W simulates the Wi-Fi dropping out / coming back (no on-screen hint)
    document.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() !== "w" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      simOffline = !simOffline;
      setOffline(!isOnline());
    });

    return {
      onStart() {             // a new download begins un-paused; if we're already offline, it waits
        userPaused = false;
        clearTimeout(resumeTimer);
        offline = !isOnline();
        apply(false);
      },
    };
  })();
})();
