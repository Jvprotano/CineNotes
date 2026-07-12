/* ============================================================
   CineNotes 2.0 — application logic
   Data model (unchanged from v1, fully compatible with existing rooms):
     movie:     { id, tmdbId, title, year, poster, posterThumb?, genre,
                  overview?, ratingJoint, ratingHim, ratingHer, dateAdded }
     watchlist: { id, tmdbId, title, year, poster, genre, overview?, dateAdded }
     dismissed: [tmdbId], dismissedWithGenres: [{ tmdbId, genreIds }]
   ============================================================ */

// ========== State ==========
let movies = [];
let watchlist = [];
let dismissed = [];
let dismissedWithGenres = [];
let recommendations = [];
let recommendationType = "trending";
let recsLoaded = false;

let session = null;
let currentView = "home";
let librarySeg = "couple";
let librarySearch = "";
let tonightPick = null; // watchlist item id
let saveTimer = null;
let dirty = false;

const detailsCache = new Map(); // `${tmdbId}:${lang}` -> details

const DEV_MODE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1";

// ========== Utilities ==========
function $(id) {
  return document.getElementById(id);
}

function icon(name, size) {
  const style = size ? ` style="width:${size}px;height:${size}px"` : "";
  return `<svg class="icon"${style}><use href="#i-${name}"/></svg>`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatRating(val) {
  return val !== null && val !== undefined ? Number(val).toFixed(1) : "–";
}

function ratingClass(r) {
  if (r === null || r === undefined) return "none";
  if (r >= 8) return "great";
  if (r >= 6.5) return "good";
  if (r >= 5) return "mid";
  return "bad";
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(userLang === "en" ? "en-US" : "pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ========== Rating helpers ==========
function getEffectiveRating(movie) {
  if (movie.ratingJoint !== null && movie.ratingJoint !== undefined)
    return movie.ratingJoint;
  const ratings = [];
  if (movie.ratingHim !== null && movie.ratingHim !== undefined)
    ratings.push(movie.ratingHim);
  if (movie.ratingHer !== null && movie.ratingHer !== undefined)
    ratings.push(movie.ratingHer);
  if (ratings.length === 0) return null;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

function getHisRating(movie) {
  if (movie.ratingHim !== null && movie.ratingHim !== undefined)
    return movie.ratingHim;
  if (movie.ratingJoint !== null && movie.ratingJoint !== undefined)
    return movie.ratingJoint;
  return null;
}

function getHerRating(movie) {
  if (movie.ratingHer !== null && movie.ratingHer !== undefined)
    return movie.ratingHer;
  if (movie.ratingJoint !== null && movie.ratingJoint !== undefined)
    return movie.ratingJoint;
  return null;
}

// ========== Analytics ==========
function isAnalyticsEnabled() {
  return !DEV_MODE && typeof window.gtag === "function";
}

function trackEvent(name, params = {}) {
  if (!isAnalyticsEnabled()) return;
  window.gtag("event", name, {
    app_name: "CineNotes",
    language: userLang,
    ...params,
  });
}

function trackView(view) {
  trackEvent("page_view", {
    page_title: `CineNotes | ${view}`,
    page_path: `/app/${view}`,
    page_location: `${location.origin}/app/${view}`,
  });
}

// ========== Dev mode (localStorage + fixtures) ==========
const DEV_FIXTURES = [
  { tmdbId: 27205, title: "Inception", year: "2010", poster: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg", posterThumb: "https://image.tmdb.org/t/p/w92/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg", genre: "Ação, Ficção Científica, Aventura", overview: "Dom Cobb é um ladrão com a rara habilidade de roubar segredos do inconsciente durante o sono." },
  { tmdbId: 155, title: "The Dark Knight", year: "2008", poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg", posterThumb: "https://image.tmdb.org/t/p/w92/qJ2tW6WMUDux911r6m7haRef0WH.jpg", genre: "Drama, Ação, Crime", overview: "Batman enfrenta o Coringa, um criminoso que mergulha Gotham no caos." },
  { tmdbId: 496243, title: "Parasita", year: "2019", poster: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", posterThumb: "https://image.tmdb.org/t/p/w92/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", genre: "Comédia, Suspense, Drama", overview: "Toda a família de Ki-taek está desempregada, vivendo em um porão sujo e apertado." },
  { tmdbId: 129, title: "A Viagem de Chihiro", year: "2001", poster: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg", posterThumb: "https://image.tmdb.org/t/p/w92/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg", genre: "Animação, Família, Fantasia", overview: "Chihiro descobre um mundo secreto de deuses e monstros." },
  { tmdbId: 680, title: "Pulp Fiction", year: "1994", poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", posterThumb: "https://image.tmdb.org/t/p/w92/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", genre: "Suspense, Crime", overview: "Histórias entrelaçadas de crime em Los Angeles." },
  { tmdbId: 313369, title: "La La Land", year: "2016", poster: "https://image.tmdb.org/t/p/w500/ylXCdC106IKiarftHkcacasaAcb.jpg", posterThumb: "https://image.tmdb.org/t/p/w92/ylXCdC106IKiarftHkcacasaAcb.jpg", genre: "Comédia, Drama, Romance, Música", overview: "Uma atriz e um pianista se apaixonam em Los Angeles." },
  { tmdbId: 438631, title: "Duna", year: "2021", poster: "https://image.tmdb.org/t/p/w500/cDbNAY0KM84cxXhmj8f0dLWza3t.jpg", posterThumb: "https://image.tmdb.org/t/p/w92/cDbNAY0KM84cxXhmj8f0dLWza3t.jpg", genre: "Ficção Científica, Aventura", overview: "Paul Atreides viaja ao planeta mais perigoso do universo." },
  { tmdbId: 19404, title: "Dilwale Dulhania Le Jayenge", year: "1995", poster: "https://image.tmdb.org/t/p/w500/lfRkUr7DYdHldAqi3PwdQGBRBPM.jpg", posterThumb: "https://image.tmdb.org/t/p/w92/lfRkUr7DYdHldAqi3PwdQGBRBPM.jpg", genre: "Comédia, Drama, Romance", overview: "Raj e Simran se conhecem em uma viagem pela Europa." },
];

function devGetRoom(code) {
  return JSON.parse(localStorage.getItem(`cinenotes_room_${code}`) || "null");
}

function devSetRoom(code, data) {
  localStorage.setItem(`cinenotes_room_${code}`, JSON.stringify(data));
}

function cleanRoomCode(code) {
  return (code || "").toLowerCase().trim().replace(/[^a-z0-9-_]/g, "");
}

function devApi(endpoint, body) {
  const { code, password } = body || {};
  if (endpoint === "create") {
    const clean = cleanRoomCode(code);
    if (clean.length < 3 || clean.length > 30) throw new Error(t("errCodeLength"));
    if (!password || password.length < 4) throw new Error(t("errPasswordLength"));
    if (devGetRoom(clean)) throw new Error(t("errCodeTaken"));
    devSetRoom(clean, { password, movies: [], watchlist: [], dismissed: [], dismissedWithGenres: [] });
    return { ok: true };
  }
  if (endpoint === "load") {
    const room = devGetRoom(cleanRoomCode(code));
    if (!room) throw new Error(t("errRoomNotFound"));
    if (room.password !== password) throw new Error(t("errWrongPassword"));
    return {
      movies: room.movies || [],
      watchlist: room.watchlist || [],
      dismissed: room.dismissed || [],
      dismissedWithGenres: room.dismissedWithGenres || [],
    };
  }
  if (endpoint === "save") {
    const clean = cleanRoomCode(code);
    const room = devGetRoom(clean);
    if (!room) throw new Error(t("errRoomNotFound"));
    if (room.password !== password) throw new Error(t("errWrongPassword"));
    room.movies = body.movies || [];
    room.watchlist = body.watchlist || [];
    room.dismissed = body.dismissed || [];
    room.dismissedWithGenres = body.dismissedWithGenres || [];
    devSetRoom(clean, room);
    return { ok: true };
  }
  if (endpoint === "search") {
    const q = (body.query || "").toLowerCase();
    return { results: DEV_FIXTURES.filter((f) => f.title.toLowerCase().includes(q)) };
  }
  if (endpoint === "details") {
    const f = DEV_FIXTURES.find((x) => x.tmdbId === body.tmdbId);
    return {
      tmdbId: body.tmdbId,
      title: f ? f.title : "Movie",
      year: f ? f.year : "",
      overview: f ? f.overview : "",
      poster: f ? f.poster : "",
      backdrop: f ? f.poster.replace("/w500/", "/w1280/") : "",
      runtime: 128,
      genres: f ? f.genre : "",
      voteAverage: 8.2,
      director: "Dev Director",
      cast: [
        { name: "Ator Um", character: "Papel 1", photo: "" },
        { name: "Atriz Dois", character: "Papel 2", photo: "" },
      ],
    };
  }
  if (endpoint === "recommendations") {
    const exclude = new Set(body.excludeTmdbIds || []);
    const personalized = (body.seeds || []).length >= 3;
    return {
      results: DEV_FIXTURES.filter((f) => !exclude.has(f.tmdbId)).map((f) => ({
        ...f,
        basedOn: personalized ? (body.seeds[0].title || "") : "",
      })),
      type: personalized ? "personalized" : "trending",
    };
  }
  throw new Error("Unknown endpoint " + endpoint);
}

// ========== API client ==========
async function api(endpoint, body) {
  if (DEV_MODE) return devApi(endpoint, body);

  const langBody = ["search", "details", "recommendations"].includes(endpoint)
    ? { ...body, lang: userLang === "pt-BR" ? "pt-BR" : "en" }
    : body;

  const res = await fetch(`/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(langBody),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(t("errServer"));
  }
  if (!res.ok) throw new Error(data.error || t("errUnknown"));
  return data;
}

// ========== Persistence ==========
function setSyncState(state) {
  const dot = $("sync-dot");
  dot.className = "sync-dot" + (state ? " " + state : "");
}

async function saveToServer() {
  if (!session) return;
  setSyncState("saving");
  try {
    await api("save", {
      code: session.code,
      password: session.password,
      movies,
      watchlist,
      dismissed,
      dismissedWithGenres,
    });
    dirty = false;
    setSyncState("");
  } catch (err) {
    console.error("Save failed:", err);
    setSyncState("error");
    showToast(navigator.onLine === false ? t("errOffline") : t("errSaveFailed"), true);
  }
}

function scheduleSave() {
  dirty = true;
  setSyncState("saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveToServer, 700);
}

window.addEventListener("online", () => {
  if (dirty) saveToServer();
});

// Persist and re-render after any data mutation.
function commit() {
  scheduleSave();
  render();
}

// ========== Session / auth ==========
const SESSION_KEY = "cinenotes_session_v2";

function loadStoredSession() {
  const v2 = localStorage.getItem(SESSION_KEY);
  if (v2) return JSON.parse(v2);
  // Migrate a live v1 session if present
  const v1 = sessionStorage.getItem("cinenotes_session");
  if (v1) {
    localStorage.setItem(SESSION_KEY, v1);
    return JSON.parse(v1);
  }
  return null;
}

function storeSession(s) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem("cinenotes_session");
}

function showLoginMessage(msg, type) {
  const el = $("login-message");
  el.textContent = msg;
  el.className = "login-message " + type;
  el.style.display = "block";
}

function hideLoginMessage() {
  $("login-message").style.display = "none";
}

function setFormLoading(form, loading, label) {
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = loading;
  btn.textContent = label;
}

async function doEnter(code, password, silent) {
  const data = await api("load", { code: cleanRoomCode(code), password });
  session = { code: cleanRoomCode(code), password };
  storeSession(session);
  movies = data.movies || [];
  watchlist = data.watchlist || [];
  dismissed = data.dismissed || [];
  dismissedWithGenres = data.dismissedWithGenres || [];
  if (!silent) {
    trackEvent("room_entered", {
      movies_count: movies.length,
      watchlist_count: watchlist.length,
    });
  }
  enterApp();
}

function enterApp() {
  $("login-screen").style.display = "none";
  $("app").style.display = "flex";
  $("settings-room").textContent = session.code;
  tonightPick = null;
  switchView("home");
  loadRecommendations();
}

function logout() {
  trackEvent("logged_out");
  session = null;
  clearSession();
  movies = [];
  watchlist = [];
  dismissed = [];
  dismissedWithGenres = [];
  recommendations = [];
  recsLoaded = false;
  closeAllSheets();
  $("app").style.display = "none";
  $("login-screen").style.display = "flex";
  $("form-enter").reset();
  $("form-create").reset();
  hideLoginMessage();
}

// ========== Navigation ==========
function switchView(view) {
  currentView = view;
  ["home", "library", "watchlist", "stats"].forEach((v) => {
    $(`view-${v}`).style.display = v === view ? "block" : "none";
  });
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  render();
  window.scrollTo({ top: 0 });
  trackView(view);
}

// ========== Rendering ==========
function render() {
  if (!session) return;
  if (currentView === "home") renderHome();
  else if (currentView === "library") renderLibrary();
  else if (currentView === "watchlist") renderWatchlistView();
  else if (currentView === "stats") renderStats();
}

function posterImg(item, cls) {
  return item.poster
    ? `<img src="${escapeHtml(item.poster)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=\\'no-poster\\'>${icon("clapperboard").replace(/"/g, "&quot;")}</div>'">`
    : `<div class="no-poster">${icon("clapperboard")}</div>`;
}

function movieCard(movie, opts = {}) {
  const rating = opts.ratingFn ? opts.ratingFn(movie) : getEffectiveRating(movie);
  const chip =
    rating !== null
      ? `<span class="rating-chip ${ratingClass(rating)}">${rating.toFixed(1)}</span>`
      : `<span class="rating-chip none">${t("unrated")}</span>`;
  let rank = "";
  if (opts.rank && rating !== null) {
    const cls = opts.rank <= 3 ? ` top${opts.rank}` : "";
    rank = `<span class="rank-badge${cls}">${opts.rank}</span>`;
  }
  return `
    <button class="pcard" onclick="openMovieDetail('${movie.id}')">
      <div class="pcard-poster">
        ${posterImg(movie)}
        ${chip}
        ${rank}
      </div>
      <div class="pcard-info">
        <div class="pcard-title">${escapeHtml(movie.title)}</div>
        <div class="pcard-meta">${escapeHtml(movie.year || "")}</div>
      </div>
    </button>`;
}

function emptyState(iconName, title, desc, actionLabel, actionJs) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon(iconName)}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(desc)}</p>
      ${actionLabel ? `<button class="btn btn-primary" onclick="${actionJs}">${escapeHtml(actionLabel)}</button>` : ""}
    </div>`;
}

// ----- Home -----
function renderHome() {
  const h = new Date().getHours();
  const greeting =
    h < 12 ? t("greetingMorning") : h < 18 ? t("greetingAfternoon") : t("greetingEvening");
  $("greeting-text").textContent = `${greeting} 🍿`;

  renderPendingBanner();
  renderTonight();

  const rows = [];

  // Watchlist row
  if (watchlist.length > 0) {
    const cards = watchlist
      .slice()
      .sort((a, b) => (b.dateAdded || "").localeCompare(a.dateAdded || ""))
      .slice(0, 12)
      .map(
        (item) => `
        <div class="pcard">
          <button class="pcard-poster" style="width:100%;border:none;padding:0;cursor:pointer" onclick="openWatchlistDetail('${item.id}')">
            ${posterImg(item)}
          </button>
          <div class="pcard-info">
            <div class="pcard-title">${escapeHtml(item.title)}</div>
            <div class="pcard-meta">${escapeHtml(item.year || "")}</div>
          </div>
          <div class="pcard-actions">
            <button class="chip-btn primary" onclick="openMarkWatched('${item.id}')">${icon("check")} ${t("markWatched")}</button>
          </div>
        </div>`
      )
      .join("");
    rows.push(`
      <section class="row-section">
        <div class="row-head">
          ${icon("bookmark")}
          <h2>${t("rowWatchlist")}</h2>
          <button class="icon-btn" onclick="switchView('watchlist')" aria-label="${t("seeAll")}">${icon("chevron-right")}</button>
        </div>
        <div class="h-scroll">${cards}</div>
      </section>`);
  }

  // Recommendations row
  rows.push(renderRecsRow());

  // Top picks row
  const top = movies
    .filter((m) => getEffectiveRating(m) !== null)
    .sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a))
    .slice(0, 10);
  if (top.length >= 3) {
    const cards = top.map((m, i) => movieCard(m, { rank: i + 1 })).join("");
    rows.push(`
      <section class="row-section">
        <div class="row-head">
          ${icon("trophy")}
          <h2>${t("rowTop")}</h2>
          <button class="icon-btn" onclick="switchView('library')" aria-label="${t("seeAll")}">${icon("chevron-right")}</button>
        </div>
        <div class="h-scroll">${cards}</div>
      </section>`);
  }

  $("home-rows").innerHTML = rows.join("");

  $("home-empty").innerHTML =
    movies.length === 0 && watchlist.length === 0
      ? emptyState("clapperboard", t("emptyHomeTitle"), t("emptyHomeDesc"), t("emptyHomeAction"), "openAddSheet()")
      : "";
}

function renderPendingBanner() {
  const unrated = movies.filter((m) => getEffectiveRating(m) === null);
  const el = $("pending-banner");
  if (unrated.length === 0) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `
    <div class="pending-card">
      ${icon("alert")}
      <div class="pending-copy">
        <strong>${t("pendingTitle", unrated.length)}</strong>
        <span>${t("pendingDesc")}</span>
      </div>
      <button class="btn" onclick="openRateSheet({type:'movie',id:'${unrated[0].id}'})">${t("pendingRate")}</button>
    </div>`;
}

function renderTonight() {
  const el = $("tonight-container");
  if (watchlist.length === 0) {
    el.innerHTML = "";
    return;
  }
  let pick = watchlist.find((w) => w.id === tonightPick);
  if (!pick) {
    pick = watchlist[Math.floor(Math.random() * watchlist.length)];
    tonightPick = pick.id;
  }
  const bg = pick.poster
    ? `<div class="tonight-bg" style="background-image:url('${escapeHtml(pick.poster)}')"></div>`
    : "";
  el.innerHTML = `
    <div class="tonight-card">
      ${bg}
      <div class="tonight-content">
        <div class="tonight-poster">${posterImg(pick)}</div>
        <div class="tonight-info">
          <span class="tonight-kicker">${icon("sparkles")} ${t("tonightTitle")}</span>
          <div class="tonight-title">${escapeHtml(pick.title)}</div>
          <div class="tonight-meta">${escapeHtml([pick.year, pick.genre].filter(Boolean).join(" · "))}</div>
          <div class="tonight-actions">
            <button class="btn btn-primary" onclick="openMarkWatched('${pick.id}')">${icon("check")} ${t("tonightWatched")}</button>
            ${watchlist.length > 1 ? `<button class="btn btn-ghost" onclick="shuffleTonight()">${icon("shuffle")} ${t("tonightShuffle")}</button>` : ""}
          </div>
        </div>
      </div>
    </div>`;
}

function shuffleTonight() {
  if (watchlist.length < 2) return;
  const others = watchlist.filter((w) => w.id !== tonightPick);
  tonightPick = others[Math.floor(Math.random() * others.length)].id;
  renderTonight();
  trackEvent("tonight_shuffled");
}

function renderRecsRow() {
  if (!recsLoaded) {
    return `
      <section class="row-section" id="recs-section">
        <div class="row-head">${icon("sparkles")}<h2>${t("rowRecs")}</h2></div>
        <div class="h-scroll">${'<div class="skeleton skeleton-pcard"></div>'.repeat(4)}</div>
      </section>`;
  }
  if (recommendations.length === 0) return "";

  const sub =
    recommendationType === "personalized"
      ? t("recsPersonalized", buildRecommendationSignals().length)
      : t("recsTrending");

  const signalCount = buildRecommendationSignals().length;
  const hint =
    recommendationType !== "personalized" && signalCount < 3
      ? `<div class="row-hint">${t("recsHintAddMore", 3 - signalCount)}</div>`
      : "";

  const cards = recommendations
    .map((item) => {
      const inLib = item.tmdbId && movies.some((m) => m.tmdbId === item.tmdbId);
      const inWl = item.tmdbId && watchlist.some((w) => w.tmdbId === item.tmdbId);
      const actions =
        inLib || inWl
          ? `<button class="chip-btn" disabled>${icon("check")} ${inLib ? t("inLibrary") : t("inWatchlist")}</button>`
          : `<button class="chip-btn primary" onclick="recToWatchlist(${item.tmdbId})">${icon("bookmark-plus")} ${t("actionToWatchlist")}</button>
             <button class="chip-btn danger" onclick="dismissRec(${item.tmdbId})" aria-label="${t("recsNotInterested")}">${icon("thumbs-down")}</button>`;
      return `
      <div class="pcard">
        <button class="pcard-poster" style="width:100%;border:none;padding:0;cursor:pointer" onclick="openRecDetail(${item.tmdbId})">
          ${posterImg(item)}
          ${item.voteAverage ? `<span class="rating-chip good">${Number(item.voteAverage).toFixed(1)}</span>` : ""}
        </button>
        <div class="pcard-info">
          <div class="pcard-title">${escapeHtml(item.title)}</div>
          <div class="pcard-meta">${escapeHtml(item.year || "")}</div>
          ${item.basedOn ? `<div class="pcard-reason">${t("recsBecause", escapeHtml(item.basedOn))}</div>` : ""}
        </div>
        <div class="pcard-actions">${actions}</div>
      </div>`;
    })
    .join("");

  return `
    <section class="row-section" id="recs-section">
      <div class="row-head">
        ${icon("sparkles")}
        <h2>${t("rowRecs")}</h2>
        <span class="row-sub">${sub}</span>
        <button class="icon-btn" onclick="refreshRecs()" aria-label="${t("recsRefresh")}">${icon("refresh")}</button>
      </div>
      ${hint}
      <div class="h-scroll">${cards}</div>
    </section>`;
}

// ----- Library -----
function renderLibrary() {
  const grid = $("library-grid");
  const empty = $("library-empty");
  $("library-count").textContent = movies.length ? t("nMovies", movies.length) : "";

  let list = movies.slice();
  let ratingFn = getEffectiveRating;
  let showRank = true;

  if (librarySeg === "his") {
    list = list.filter((m) => getHisRating(m) !== null);
    list.sort((a, b) => getHisRating(b) - getHisRating(a));
    ratingFn = getHisRating;
  } else if (librarySeg === "hers") {
    list = list.filter((m) => getHerRating(m) !== null);
    list.sort((a, b) => getHerRating(b) - getHerRating(a));
    ratingFn = getHerRating;
  } else if (librarySeg === "recent") {
    list.sort((a, b) => (b.dateAdded || "").localeCompare(a.dateAdded || ""));
    showRank = false;
  } else {
    list.sort(
      (a, b) => (getEffectiveRating(b) ?? -1) - (getEffectiveRating(a) ?? -1)
    );
  }

  // Ranks are computed before the text filter so #1 stays #1 while searching.
  const ranked = list.map((m, i) => ({ m, rank: i + 1 }));

  const q = librarySearch.trim().toLowerCase();
  const filtered = q
    ? ranked.filter(({ m }) => (m.title || "").toLowerCase().includes(q))
    : ranked;

  if (movies.length === 0) {
    grid.innerHTML = "";
    empty.innerHTML = emptyState("film", t("emptyLibraryTitle"), t("emptyLibraryDesc"), t("emptyLibraryAction"), "openAddSheet()");
    return;
  }
  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.innerHTML = q
      ? `<div class="empty-state"><p style="margin-bottom:0">${t("noSearchResults", escapeHtml(librarySearch))}</p></div>`
      : emptyState("user", t("emptySegTitle"), t("emptySegDesc"));
    return;
  }
  empty.innerHTML = "";
  grid.innerHTML = filtered
    .map(({ m, rank }) => movieCard(m, { ratingFn, rank: showRank ? rank : 0 }))
    .join("");
}

// ----- Watchlist view -----
function renderWatchlistView() {
  const grid = $("watchlist-grid");
  const empty = $("watchlist-empty");
  $("watchlist-count").textContent = watchlist.length ? t("nMovies", watchlist.length) : "";

  if (watchlist.length === 0) {
    grid.innerHTML = "";
    empty.innerHTML = emptyState("bookmark-plus", t("emptyWatchlistTitle"), t("emptyWatchlistDesc"), t("emptyWatchlistAction"), "openAddSheet()");
    return;
  }
  empty.innerHTML = "";
  grid.innerHTML = watchlist
    .slice()
    .sort((a, b) => (b.dateAdded || "").localeCompare(a.dateAdded || ""))
    .map(
      (item) => `
      <div class="pcard">
        <button class="pcard-poster" style="width:100%;border:none;padding:0;cursor:pointer" onclick="openWatchlistDetail('${item.id}')">
          ${posterImg(item)}
        </button>
        <div class="pcard-info">
          <div class="pcard-title">${escapeHtml(item.title)}</div>
          <div class="pcard-meta">${escapeHtml(item.year || "")}</div>
        </div>
        <div class="pcard-actions">
          <button class="chip-btn primary" onclick="openMarkWatched('${item.id}')">${icon("check")} ${t("markWatched")}</button>
          <button class="chip-btn danger" onclick="removeWatchlistItem('${item.id}')" aria-label="${t("remove")}">${icon("x")}</button>
        </div>
      </div>`
    )
    .join("");
}

// ----- Stats -----
function renderStats() {
  const body = $("stats-body");
  const rated = movies.filter((m) => getEffectiveRating(m) !== null);

  if (movies.length === 0) {
    body.innerHTML = emptyState("chart", t("statsEmptyTitle"), t("statsEmptyDesc"), t("emptyLibraryAction"), "openAddSheet()");
    return;
  }

  const avg = rated.length
    ? rated.reduce((s, m) => s + getEffectiveRating(m), 0) / rated.length
    : null;
  const thisYear = new Date().getFullYear();
  const watchedThisYear = movies.filter(
    (m) => (m.dateAdded || "").slice(0, 4) === String(thisYear)
  ).length;

  let html = `
    <div class="stats-tiles">
      <div class="stat-tile accent"><div class="stat-value">${movies.length}</div><div class="stat-label">${t("statMovies")}</div></div>
      <div class="stat-tile"><div class="stat-value">${avg !== null ? avg.toFixed(1) : "–"}</div><div class="stat-label">${t("statAvg")}</div></div>
      <div class="stat-tile"><div class="stat-value">${watchedThisYear}</div><div class="stat-label">${t("statThisYear", thisYear)}</div></div>
      <div class="stat-tile"><div class="stat-value">${watchlist.length}</div><div class="stat-label">${t("statWatchlist")}</div></div>
    </div>`;

  // Him vs her
  const hisRated = movies.filter((m) => getHisRating(m) !== null);
  const herRated = movies.filter((m) => getHerRating(m) !== null);
  const hisAvg = hisRated.length
    ? hisRated.reduce((s, m) => s + getHisRating(m), 0) / hisRated.length
    : null;
  const herAvg = herRated.length
    ? herRated.reduce((s, m) => s + getHerRating(m), 0) / herRated.length
    : null;

  const both = movies.filter(
    (m) =>
      m.ratingHim !== null && m.ratingHim !== undefined &&
      m.ratingHer !== null && m.ratingHer !== undefined
  );

  if (hisAvg !== null || herAvg !== null) {
    let syncHtml = "";
    if (both.length > 0) {
      const avgDiff =
        both.reduce((s, m) => s + Math.abs(m.ratingHim - m.ratingHer), 0) / both.length;
      const syncPct = Math.max(0, Math.round(100 - avgDiff * 10));
      const fight = both.slice().sort(
        (a, b) => Math.abs(b.ratingHim - b.ratingHer) - Math.abs(a.ratingHim - a.ratingHer)
      )[0];
      const fightDiff = fight ? Math.abs(fight.ratingHim - fight.ratingHer) : 0;

      syncHtml = `
        <div class="sync-meter">
          <div class="sync-meter-head">
            <span>${t("agreementTitle")}</span>
            <strong>${syncPct}%</strong>
          </div>
          <div class="meter-track"><div class="meter-fill" style="width:${syncPct}%"></div></div>
          <p class="stats-note">${t("agreementDesc", both.length)}</p>
        </div>
        ${
          fight && fightDiff >= 1
            ? `<button class="fight-row" style="width:100%;text-align:left" onclick="openMovieDetail('${fight.id}')">
                <div class="fight-poster">${posterImg(fight)}</div>
                <div class="fight-info">
                  <strong>${escapeHtml(fight.title)}</strong>
                  <span>${t("biggestFight")}</span>
                </div>
                <div class="fight-scores">
                  <span class="him">${icon("user", 13)} ${formatRating(fight.ratingHim)}</span>
                  <span class="her">${icon("heart", 13)} ${formatRating(fight.ratingHer)}</span>
                </div>
              </button>`
            : ""
        }`;
    } else {
      syncHtml = `<p class="stats-note">${t("agreementNone")}</p>`;
    }

    html += `
      <div class="stats-card">
        <h3>${icon("users")} ${t("hisVsHers")}</h3>
        <div class="vs-row">
          <div class="vs-side him"><div class="vs-score">${hisAvg !== null ? hisAvg.toFixed(1) : "–"}</div><div class="vs-label">${t("avgHis")}</div></div>
          <span class="vs-x">×</span>
          <div class="vs-side her"><div class="vs-score">${herAvg !== null ? herAvg.toFixed(1) : "–"}</div><div class="vs-label">${t("avgHers")}</div></div>
        </div>
        ${syncHtml}
      </div>`;
  }

  // Genres
  const genreCount = {};
  movies.forEach((m) => {
    (m.genre || "").split(",").map((g) => g.trim()).filter(Boolean).forEach((g) => {
      genreCount[g] = (genreCount[g] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (topGenres.length > 0) {
    const max = topGenres[0][1];
    html += `
      <div class="stats-card">
        <h3>${icon("film")} ${t("topGenres")}</h3>
        ${topGenres
          .map(
            ([g, n]) => `
          <div class="bar-row">
            <span class="bar-label">${escapeHtml(g)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((n / max) * 100)}%"></div></div>
            <span class="bar-value">${n}</span>
          </div>`
          )
          .join("")}
      </div>`;
  }

  // Decades
  const decadeCount = {};
  movies.forEach((m) => {
    const y = parseInt(m.year);
    if (y > 1900) {
      const d = Math.floor(y / 10) * 10;
      decadeCount[d] = (decadeCount[d] || 0) + 1;
    }
  });
  const decades = Object.entries(decadeCount).sort((a, b) => a[0] - b[0]);
  if (decades.length > 1) {
    const max = Math.max(...decades.map(([, n]) => n));
    html += `
      <div class="stats-card">
        <h3>${icon("calendar")} ${t("byDecade")}</h3>
        ${decades
          .map(
            ([d, n]) => `
          <div class="bar-row">
            <span class="bar-label">${d}s</span>
            <div class="bar-track"><div class="bar-fill alt" style="width:${Math.round((n / max) * 100)}%"></div></div>
            <span class="bar-value">${n}</span>
          </div>`
          )
          .join("")}
      </div>`;
  }

  // Best & worst
  if (rated.length >= 2) {
    const sorted = rated.slice().sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    html += `
      <div class="duo-row">
        <button class="duo-card best" onclick="openMovieDetail('${best.id}')">
          <div class="duo-poster">${posterImg(best)}</div>
          <div class="duo-info">
            <span class="duo-kicker">${t("bestMovie")}</span>
            <span class="duo-title">${escapeHtml(best.title)}</span>
            <div class="duo-score">${getEffectiveRating(best).toFixed(1)}</div>
          </div>
        </button>
        <button class="duo-card worst" onclick="openMovieDetail('${worst.id}')">
          <div class="duo-poster">${posterImg(worst)}</div>
          <div class="duo-info">
            <span class="duo-kicker">${t("worstMovie")}</span>
            <span class="duo-title">${escapeHtml(worst.title)}</span>
            <div class="duo-score">${getEffectiveRating(worst).toFixed(1)}</div>
          </div>
        </button>
      </div>`;
  }

  body.innerHTML = html;
}

// ========== Sheets ==========
function openSheet(id) {
  $(id).style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeSheet(id) {
  $(id).style.display = "none";
  if (!document.querySelector('.sheet-overlay[style*="flex"]')) {
    document.body.style.overflow = "";
  }
}

function closeAllSheets() {
  document.querySelectorAll(".sheet-overlay").forEach((el) => (el.style.display = "none"));
  document.body.style.overflow = "";
}

document.querySelectorAll(".sheet-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSheet(overlay.id);
  });
});

document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => closeSheet(btn.dataset.close));
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const open = [...document.querySelectorAll(".sheet-overlay")].filter(
      (el) => el.style.display === "flex"
    );
    if (open.length) closeSheet(open[open.length - 1].id);
  }
});

// ----- Confirm -----
let confirmResolve = null;

function showConfirm(message) {
  $("confirm-message").textContent = message;
  openSheet("sheet-confirm");
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

$("btn-confirm-ok").addEventListener("click", () => {
  closeSheet("sheet-confirm");
  if (confirmResolve) confirmResolve(true);
  confirmResolve = null;
});

$("btn-confirm-cancel").addEventListener("click", () => {
  closeSheet("sheet-confirm");
  if (confirmResolve) confirmResolve(false);
  confirmResolve = null;
});

// ----- Toast -----
function showToast(message, isError) {
  const container = $("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast" + (isError ? " error" : "");
  toast.innerHTML = `${icon(isError ? "alert" : "check")} <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("out");
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// ========== Add sheet ==========
let addSearchResults = [];

function openAddSheet() {
  closeAllSheets();
  openSheet("sheet-add");
  $("add-search").value = "";
  addSearchResults = [];
  renderAddResults();
  setTimeout(() => $("add-search").focus(), 250);
  trackEvent("add_sheet_opened");
}

const runAddSearch = debounce(async (query) => {
  if (query.length < 2) {
    addSearchResults = [];
    renderAddResults();
    return;
  }
  $("add-results").innerHTML = `<p class="add-hint">${t("addSearching")}</p>`;
  try {
    const data = await api("search", { query });
    addSearchResults = data.results || [];
    renderAddResults(query);
  } catch (err) {
    $("add-results").innerHTML = `<p class="add-hint">${escapeHtml(err.message)}</p>`;
  }
}, 380);

$("add-search").addEventListener("input", (e) => {
  runAddSearch(e.target.value.trim());
});

function renderAddResults(query) {
  const el = $("add-results");
  if (addSearchResults.length === 0) {
    el.innerHTML = `<p class="add-hint">${
      query ? t("addNoResults", escapeHtml(query)) : t("addSearchHint")
    }</p>`;
    return;
  }
  el.innerHTML = addSearchResults
    .map((r, i) => {
      const inLib = r.tmdbId && movies.some((m) => m.tmdbId === r.tmdbId);
      const inWl = r.tmdbId && watchlist.some((w) => w.tmdbId === r.tmdbId);
      const badge = inLib
        ? `<span class="result-badge">${icon("check")} ${t("inLibrary")}</span>`
        : inWl
          ? `<span class="result-badge">${icon("bookmark")} ${t("inWatchlist")}</span>`
          : "";
      const actions =
        inLib || inWl
          ? ""
          : `<div class="result-actions">
              <button class="chip-btn" onclick="addResultToWatchlist(${i})">${icon("bookmark-plus")} ${t("actionToWatchlist")}</button>
              <button class="chip-btn primary" onclick="addResultAsWatched(${i})">${icon("check")} ${t("actionWatched")}</button>
            </div>`;
      return `
      <div class="result-row">
        <div class="result-poster">${
          r.posterThumb || r.poster
            ? `<img src="${escapeHtml(r.posterThumb || r.poster)}" alt="" loading="lazy">`
            : `<div class="no-poster">${icon("clapperboard")}</div>`
        }</div>
        <div class="result-info">
          <div class="result-title">${escapeHtml(r.title)}</div>
          <div class="result-meta">${escapeHtml([r.year, r.genre].filter(Boolean).join(" · "))}</div>
          ${badge}
        </div>
        ${actions}
      </div>`;
    })
    .join("");
}

function addResultToWatchlist(index) {
  const r = addSearchResults[index];
  if (!r) return;
  watchlist.push({
    id: generateId(),
    tmdbId: r.tmdbId || null,
    title: r.title,
    year: r.year || "",
    poster: r.poster || "",
    genre: r.genre || "",
    overview: r.overview || "",
    dateAdded: todayISO(),
  });
  if (r.tmdbId) clearDismissed(r.tmdbId);
  commit();
  renderAddResults($("add-search").value.trim());
  showToast(t("toastAddedWatchlist", r.title));
  trackEvent("watchlist_added", { source: "search" });
}

function addResultAsWatched(index) {
  const r = addSearchResults[index];
  if (!r) return;
  const movie = {
    id: generateId(),
    tmdbId: r.tmdbId || null,
    title: r.title,
    year: r.year || "",
    poster: r.poster || "",
    genre: r.genre || "",
    overview: r.overview || "",
    ratingJoint: null,
    ratingHim: null,
    ratingHer: null,
    dateAdded: todayISO(),
  };
  movies.push(movie);
  if (r.tmdbId) clearDismissed(r.tmdbId);
  commit();
  renderAddResults($("add-search").value.trim());
  trackEvent("movie_added", { source: "search" });
  openRateSheet({ type: "movie", id: movie.id, fromAdd: true });
}

// ========== Rate sheet ==========
// context: { type: 'movie', id, fromAdd? } — rate/edit an existing movie entry
//          { type: 'watchlist', id }       — mark watchlist item as watched
let rateContext = null;
let rateMode = "joint";

function setSliderFill(input) {
  input.style.setProperty("--pct", (input.value / 10) * 100 + "%");
}

["slider-joint", "slider-him", "slider-her"].forEach((id) => {
  const input = $(id);
  input.addEventListener("input", () => {
    $(id + "-val").textContent = Number(input.value).toFixed(1);
    setSliderFill(input);
  });
});

function setRateMode(mode) {
  rateMode = mode;
  document.querySelectorAll("#rate-mode .seg").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
  $("rate-joint").style.display = mode === "joint" ? "flex" : "none";
  $("rate-individual").style.display = mode === "individual" ? "flex" : "none";
}

document.querySelectorAll("#rate-mode .seg").forEach((btn) => {
  btn.addEventListener("click", () => setRateMode(btn.dataset.mode));
});

function setSlider(id, value) {
  const input = $(id);
  input.value = value;
  $(id + "-val").textContent = Number(value).toFixed(1);
  setSliderFill(input);
}

function openRateSheet(context) {
  rateContext = context;
  const item =
    context.type === "movie"
      ? movies.find((m) => m.id === context.id)
      : watchlist.find((w) => w.id === context.id);
  if (!item) return;

  $("rate-movie").innerHTML = `
    <div class="result-poster">${posterImg(item)}</div>
    <div>
      <div class="rate-movie-title">${escapeHtml(item.title)}</div>
      <div class="rate-movie-meta">${escapeHtml([item.year, item.genre].filter(Boolean).join(" · "))}</div>
    </div>`;

  // Prefill from existing ratings
  const hasIndividual =
    context.type === "movie" &&
    ((item.ratingHim !== null && item.ratingHim !== undefined) ||
      (item.ratingHer !== null && item.ratingHer !== undefined));
  setRateMode(hasIndividual ? "individual" : "joint");
  setSlider("slider-joint", context.type === "movie" && item.ratingJoint != null ? item.ratingJoint : 7);
  setSlider("slider-him", context.type === "movie" && item.ratingHim != null ? item.ratingHim : 7);
  setSlider("slider-her", context.type === "movie" && item.ratingHer != null ? item.ratingHer : 7);

  // "Rate later" only makes sense when something happens even without a rating
  $("btn-rate-later").style.display =
    context.type === "watchlist" || context.fromAdd ? "block" : "none";

  openSheet("sheet-rate");
}

function collectRatings() {
  if (rateMode === "joint") {
    return { ratingJoint: parseFloat($("slider-joint").value), ratingHim: null, ratingHer: null };
  }
  return {
    ratingJoint: null,
    ratingHim: parseFloat($("slider-him").value),
    ratingHer: parseFloat($("slider-her").value),
  };
}

function watchlistToMovie(item, ratings) {
  watchlist = watchlist.filter((w) => w.id !== item.id);
  if (tonightPick === item.id) tonightPick = null;
  movies.push({
    id: generateId(),
    tmdbId: item.tmdbId || null,
    title: item.title,
    year: item.year || "",
    poster: item.poster || "",
    genre: item.genre || "",
    overview: item.overview || "",
    ratingJoint: ratings ? ratings.ratingJoint : null,
    ratingHim: ratings ? ratings.ratingHim : null,
    ratingHer: ratings ? ratings.ratingHer : null,
    dateAdded: todayISO(),
  });
}

$("btn-rate-save").addEventListener("click", () => {
  if (!rateContext) return;
  const ratings = collectRatings();

  if (rateContext.type === "movie") {
    const movie = movies.find((m) => m.id === rateContext.id);
    if (movie) Object.assign(movie, ratings);
    trackEvent("movie_rated", { mode: rateMode });
  } else {
    const item = watchlist.find((w) => w.id === rateContext.id);
    if (item) {
      watchlistToMovie(item, ratings);
      showToast(t("toastAddedLibrary", item.title));
      trackEvent("watchlist_marked_watched", { mode: rateMode });
    }
  }
  closeSheet("sheet-rate");
  rateContext = null;
  commit();
});

$("btn-rate-later").addEventListener("click", () => {
  if (rateContext && rateContext.type === "watchlist") {
    const item = watchlist.find((w) => w.id === rateContext.id);
    if (item) {
      watchlistToMovie(item, null);
      showToast(t("toastAddedLibrary", item.title));
    }
    commit();
  }
  closeSheet("sheet-rate");
  rateContext = null;
});

function openMarkWatched(watchlistId) {
  openRateSheet({ type: "watchlist", id: watchlistId });
}

// ========== Detail sheet ==========
// kind: 'movie' | 'watchlist' | 'rec'
async function openDetail(kind, item) {
  openSheet("sheet-detail");
  renderDetail(kind, item, null);

  if (item.tmdbId) {
    const cacheKey = `${item.tmdbId}:${userLang}`;
    let details = detailsCache.get(cacheKey);
    if (!details) {
      try {
        details = await api("details", { tmdbId: item.tmdbId });
        detailsCache.set(cacheKey, details);
      } catch {
        details = null;
      }
    }
    // Only update if this sheet is still showing the same item
    if (details && $("sheet-detail").style.display === "flex" && currentDetail === item) {
      renderDetail(kind, item, details);
    }
  }
}

let currentDetail = null;

function renderDetail(kind, item, details) {
  currentDetail = item;
  const body = $("detail-body");

  const backdrop = details && details.backdrop ? details.backdrop : "";
  const overview = (details && details.overview) || item.overview || "";
  const genres = (details && details.genres) || item.genre || "";
  const runtime = details && details.runtime ? t("runtimeMin", details.runtime) : "";
  const director = details && details.director ? details.director : "";
  const tmdbScore = details && details.voteAverage ? Number(details.voteAverage).toFixed(1) : item.voteAverage ? Number(item.voteAverage).toFixed(1) : "";
  const cast = (details && details.cast) || [];

  const metaLine = [item.year, genres, runtime].filter(Boolean).join(" · ");

  // Ratings pills
  let pills = "";
  if (kind === "movie") {
    const parts = [];
    if (item.ratingJoint !== null && item.ratingJoint !== undefined)
      parts.push(`<span class="detail-rating-pill joint">${icon("users")} ${t("jointLabel")} <strong>${formatRating(item.ratingJoint)}</strong></span>`);
    if (item.ratingHim !== null && item.ratingHim !== undefined)
      parts.push(`<span class="detail-rating-pill him">${icon("user")} ${t("hisLabel")} <strong>${formatRating(item.ratingHim)}</strong></span>`);
    if (item.ratingHer !== null && item.ratingHer !== undefined)
      parts.push(`<span class="detail-rating-pill her">${icon("heart")} ${t("herLabel")} <strong>${formatRating(item.ratingHer)}</strong></span>`);
    if (tmdbScore)
      parts.push(`<span class="detail-rating-pill tmdb">${icon("star")} TMDB <strong>${tmdbScore}</strong></span>`);
    if (parts.length)
      pills = `<div class="detail-section"><h3>${t("ratingsTitle")}</h3><div class="detail-ratings">${parts.join("")}</div></div>`;
  } else if (tmdbScore) {
    pills = `<div class="detail-section"><div class="detail-ratings"><span class="detail-rating-pill tmdb">${icon("star")} ${t("tmdbScore")} <strong>${tmdbScore}</strong></span></div></div>`;
  }

  // Actions per kind
  let actions = "";
  if (kind === "movie") {
    const rated = getEffectiveRating(item) !== null;
    actions = `
      <div class="detail-actions">
        <button class="btn btn-primary btn-block" onclick="closeSheet('sheet-detail');openRateSheet({type:'movie',id:'${item.id}'})">${icon("star")} ${rated ? t("editRatings") : t("rateMovie")}</button>
        <div class="detail-actions-row">
          <button class="btn btn-ghost" onclick="openEditSheet('${item.id}')">${icon("pencil")} ${t("editDetails")}</button>
          <button class="btn btn-danger-ghost" onclick="deleteMovie('${item.id}')">${icon("trash")} ${t("deleteMovie")}</button>
        </div>
      </div>
      ${item.dateAdded ? `<p class="detail-added">${t("addedOn", formatDate(item.dateAdded))}</p>` : ""}`;
  } else if (kind === "watchlist") {
    actions = `
      <div class="detail-actions">
        <button class="btn btn-primary btn-block" onclick="closeSheet('sheet-detail');openMarkWatched('${item.id}')">${icon("check")} ${t("markWatched")}</button>
        <button class="btn btn-danger-ghost btn-block" onclick="removeWatchlistItem('${item.id}', true)">${icon("trash")} ${t("remove")}</button>
      </div>`;
  } else if (kind === "rec") {
    const inLib = item.tmdbId && movies.some((m) => m.tmdbId === item.tmdbId);
    const inWl = item.tmdbId && watchlist.some((w) => w.tmdbId === item.tmdbId);
    actions = `
      <div class="detail-actions">
        ${
          inLib || inWl
            ? `<button class="btn btn-ghost btn-block" disabled>${icon("check")} ${inLib ? t("inLibrary") : t("inWatchlist")}</button>`
            : `<button class="btn btn-primary btn-block" onclick="closeSheet('sheet-detail');recToWatchlist(${item.tmdbId})">${icon("bookmark-plus")} ${t("actionToWatchlist")}</button>
               <div class="detail-actions-row">
                 <button class="btn btn-ghost" onclick="closeSheet('sheet-detail');recAsWatched(${item.tmdbId})">${icon("check")} ${t("actionWatched")}</button>
                 <button class="btn btn-danger-ghost" onclick="closeSheet('sheet-detail');dismissRec(${item.tmdbId})">${icon("thumbs-down")} ${t("recsNotInterested")}</button>
               </div>`
        }
      </div>`;
  }

  body.innerHTML = `
    <div class="detail-hero" ${backdrop ? `style="background-image:url('${escapeHtml(backdrop)}')"` : ""}></div>
    <div class="detail-head">
      <div class="detail-poster">${posterImg(item)}</div>
      <div class="detail-titles">
        <h2>${escapeHtml(item.title)}</h2>
        <div class="detail-meta">${escapeHtml(metaLine)}${director ? `<br>${t("directedBy")}: <strong>${escapeHtml(director)}</strong>` : ""}</div>
        ${kind === "rec" && item.basedOn ? `<div class="detail-reason">${t("recsBecause", escapeHtml(item.basedOn))}</div>` : ""}
      </div>
    </div>
    ${pills}
    ${overview ? `<div class="detail-section"><h3>${t("overviewTitle")}</h3><p class="detail-overview">${escapeHtml(overview)}</p></div>` : ""}
    ${
      cast.length
        ? `<div class="detail-section"><h3>${t("castTitle")}</h3>
           <div class="cast-scroll">${cast
             .map(
               (c) => `
             <div class="cast-card">
               <div class="cast-photo">${c.photo ? `<img src="${escapeHtml(c.photo)}" alt="" loading="lazy">` : icon("user")}</div>
               <div class="cast-name">${escapeHtml(c.name)}</div>
               <div class="cast-role">${escapeHtml(c.character || "")}</div>
             </div>`
             )
             .join("")}</div></div>`
        : ""
    }
    ${actions}`;
}

function openMovieDetail(id) {
  const movie = movies.find((m) => m.id === id);
  if (movie) openDetail("movie", movie);
}

function openWatchlistDetail(id) {
  const item = watchlist.find((w) => w.id === id);
  if (item) openDetail("watchlist", item);
}

function openRecDetail(tmdbId) {
  const item = recommendations.find((r) => r.tmdbId === tmdbId);
  if (item) openDetail("rec", item);
}

async function deleteMovie(id) {
  const movie = movies.find((m) => m.id === id);
  if (!movie) return;
  const ok = await showConfirm(t("confirmDelete"));
  if (!ok) return;
  movies = movies.filter((m) => m.id !== id);
  closeSheet("sheet-detail");
  commit();
  showToast(t("toastRemoved", movie.title));
  trackEvent("movie_deleted");
}

async function removeWatchlistItem(id, fromDetail) {
  const item = watchlist.find((w) => w.id === id);
  if (!item) return;
  const ok = await showConfirm(t("confirmRemoveWatchlist"));
  if (!ok) return;
  watchlist = watchlist.filter((w) => w.id !== id);
  if (tonightPick === id) tonightPick = null;
  if (fromDetail) closeSheet("sheet-detail");
  commit();
  showToast(t("toastRemoved", item.title));
  trackEvent("watchlist_removed");
}

// ========== Edit details sheet ==========
let editMovieId = null;

function openEditSheet(id) {
  const movie = movies.find((m) => m.id === id);
  if (!movie) return;
  editMovieId = id;
  $("edit-title").value = movie.title || "";
  $("edit-year").value = movie.year || "";
  $("edit-genre").value = movie.genre || "";
  $("edit-poster").value = movie.poster || "";
  closeSheet("sheet-detail");
  openSheet("sheet-edit");
}

$("form-edit").addEventListener("submit", (e) => {
  e.preventDefault();
  const movie = movies.find((m) => m.id === editMovieId);
  if (!movie) return;
  movie.title = $("edit-title").value.trim();
  movie.year = $("edit-year").value.trim();
  movie.genre = $("edit-genre").value.trim();
  movie.poster = $("edit-poster").value.trim();
  closeSheet("sheet-edit");
  commit();
  showToast(t("toastSaved"));
});

// ========== Recommendations ==========
const GENRE_NAME_TO_ID = {
  // PT-BR
  "Ação": 28, "Aventura": 12, "Animação": 16, "Comédia": 35, "Crime": 80,
  "Documentário": 99, "Drama": 18, "Família": 10751, "Fantasia": 14, "História": 36,
  "Terror": 27, "Música": 10402, "Mistério": 9648, "Romance": 10749,
  "Ficção Científica": 878, "Telefilme": 10770, "Suspense": 53, "Guerra": 10752,
  "Faroeste": 37,
  // EN
  Action: 28, Adventure: 12, Animation: 16, Comedy: 35,
  Documentary: 99, Family: 10751, Fantasy: 14, History: 36,
  Horror: 27, Music: 10402, Mystery: 9648,
  "Science Fiction": 878, "TV Movie": 10770, Thriller: 53, War: 10752,
  Western: 37,
};

function getGenreIdsFromItem(item) {
  if (!item.genre) return [];
  return item.genre
    .split(",")
    .map((g) => GENRE_NAME_TO_ID[g.trim()])
    .filter(Boolean);
}

function computeSeedThreshold() {
  const rated = movies.filter((m) => m.tmdbId && getEffectiveRating(m) !== null);
  if (rated.length < 3) return null;
  const ratings = rated.map((m) => getEffectiveRating(m));
  const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const variance = ratings.reduce((s, r) => s + (r - mean) ** 2, 0) / ratings.length;
  return mean + Math.sqrt(variance);
}

function buildRecommendationSignals() {
  const ratedSignals = movies
    .filter((m) => m.tmdbId && getEffectiveRating(m) !== null)
    .map((m) => ({
      tmdbId: m.tmdbId,
      rating: getEffectiveRating(m),
      genreIds: getGenreIdsFromItem(m),
      signalType: "rating",
      title: m.title || "",
      year: m.year || "",
      dateAdded: m.dateAdded || "",
    }));

  const ratedIds = new Set(ratedSignals.map((m) => m.tmdbId));
  const watchlistSignals = watchlist
    .filter((w) => w.tmdbId && !ratedIds.has(w.tmdbId))
    .map((w) => ({
      tmdbId: w.tmdbId,
      rating: 6.5,
      genreIds: getGenreIdsFromItem(w),
      signalType: "watchlist",
      title: w.title || "",
      year: w.year || "",
      dateAdded: w.dateAdded || "",
    }));

  return [...ratedSignals, ...watchlistSignals];
}

function computeMedianYear() {
  const years = movies
    .filter((m) => m.year)
    .map((m) => parseInt(m.year))
    .filter((y) => y > 1900)
    .sort((a, b) => a - b);
  if (!years.length) return null;
  const mid = Math.floor(years.length / 2);
  return years.length % 2 ? years[mid] : Math.round((years[mid - 1] + years[mid]) / 2);
}

function getDislikedGenreIds() {
  const lowRated = movies.filter((m) => {
    const r = getEffectiveRating(m);
    return r !== null && r < 5;
  });
  if (lowRated.length < 2) return [];

  const genreCount = {};
  lowRated.forEach((m) => {
    getGenreIdsFromItem(m).forEach((id) => {
      genreCount[id] = (genreCount[id] || 0) + 1;
    });
  });

  const threshold = computeSeedThreshold() || 8;
  const likedGenres = new Set();
  movies
    .filter((m) => getEffectiveRating(m) !== null && getEffectiveRating(m) >= threshold)
    .forEach((m) => {
      getGenreIdsFromItem(m).forEach((id) => likedGenres.add(id));
    });

  return Object.entries(genreCount)
    .filter(([id, count]) => count >= 2 && !likedGenres.has(parseInt(id)))
    .map(([id]) => parseInt(id));
}

async function loadRecommendations() {
  recsLoaded = false;
  if (currentView === "home") renderHome();

  try {
    const excludeTmdbIds = Array.from(
      new Set([
        ...movies.filter((m) => m.tmdbId).map((m) => m.tmdbId),
        ...watchlist.filter((w) => w.tmdbId).map((w) => w.tmdbId),
        ...dismissed,
      ])
    );

    const seeds = buildRecommendationSignals();
    const dislikedGenreIds = getDislikedGenreIds();

    const body = { excludeTmdbIds };
    if (seeds.length > 0) body.seeds = seeds;
    if (dislikedGenreIds.length > 0) body.dislikedGenreIds = dislikedGenreIds;
    const dg = (dismissedWithGenres || []).slice(-50);
    if (dg.length > 0) body.dismissedWithGenres = dg;
    const medianYear = computeMedianYear();
    if (medianYear) body.medianYear = medianYear;

    const data = await api("recommendations", body);
    recommendations = data.results || [];
    recommendationType = data.type || "trending";
    trackEvent("recommendations_loaded", {
      recommendation_type: recommendationType,
      results_count: recommendations.length,
      signal_count: seeds.length,
    });
  } catch (err) {
    console.error("Recommendations failed:", err);
    recommendations = [];
  }
  recsLoaded = true;
  if (currentView === "home") renderHome();
}

function refreshRecs() {
  loadRecommendations();
  trackEvent("recommendations_refreshed");
}

function clearDismissed(tmdbId) {
  if (!tmdbId) return;
  dismissed = dismissed.filter((id) => id !== tmdbId);
  dismissedWithGenres = dismissedWithGenres.filter((d) => d.tmdbId !== tmdbId);
}

function recToWatchlist(tmdbId) {
  const item = recommendations.find((r) => r.tmdbId === tmdbId);
  if (!item) return;
  watchlist.push({
    id: generateId(),
    tmdbId: item.tmdbId,
    title: item.title,
    year: item.year || "",
    poster: item.poster || "",
    genre: item.genre || "",
    overview: item.overview || "",
    dateAdded: todayISO(),
  });
  recommendations = recommendations.filter((r) => r.tmdbId !== tmdbId);
  clearDismissed(tmdbId);
  commit();
  showToast(t("toastAddedWatchlist", item.title));
  trackEvent("watchlist_added", { source: "recommendation" });
}

function recAsWatched(tmdbId) {
  const item = recommendations.find((r) => r.tmdbId === tmdbId);
  if (!item) return;
  const movie = {
    id: generateId(),
    tmdbId: item.tmdbId,
    title: item.title,
    year: item.year || "",
    poster: item.poster || "",
    genre: item.genre || "",
    overview: item.overview || "",
    ratingJoint: null,
    ratingHim: null,
    ratingHer: null,
    dateAdded: todayISO(),
  };
  movies.push(movie);
  recommendations = recommendations.filter((r) => r.tmdbId !== tmdbId);
  clearDismissed(tmdbId);
  commit();
  trackEvent("movie_added", { source: "recommendation" });
  openRateSheet({ type: "movie", id: movie.id, fromAdd: true });
}

function dismissRec(tmdbId) {
  const item = recommendations.find((r) => r.tmdbId === tmdbId);
  if (!tmdbId || !item) return;
  if (!dismissed.includes(tmdbId)) dismissed.push(tmdbId);
  dismissedWithGenres.push({ tmdbId, genreIds: getGenreIdsFromItem(item) });
  recommendations = recommendations.filter((r) => r.tmdbId !== tmdbId);
  commit();
  showToast(t("toastDismissed"));
  trackEvent("recommendation_dismissed");
}

// ========== Login events ==========
document.querySelectorAll(".login-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".login-tab").forEach((x) => x.classList.remove("active"));
    tab.classList.add("active");
    const mode = tab.dataset.ltab;
    $("form-enter").style.display = mode === "enter" ? "block" : "none";
    $("form-create").style.display = mode === "create" ? "block" : "none";
    hideLoginMessage();
  });
});

$("form-enter").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideLoginMessage();
  const form = e.target;
  setFormLoading(form, true, t("entering"));
  try {
    await doEnter($("enter-code").value, $("enter-pass").value);
  } catch (err) {
    showLoginMessage(err.message, "error");
  } finally {
    setFormLoading(form, false, t("btnEnter"));
  }
});

$("form-create").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideLoginMessage();
  const form = e.target;
  const code = $("create-code").value;
  const password = $("create-pass").value;
  setFormLoading(form, true, t("creatingRoom"));
  try {
    await api("create", { code: cleanRoomCode(code), password });
    showLoginMessage(t("roomCreated"), "success");
    trackEvent("room_created");
    await doEnter(code, password, true);
  } catch (err) {
    showLoginMessage(err.message, "error");
  } finally {
    setFormLoading(form, false, t("btnCreateRoom"));
  }
});

// ========== App shell events ==========
document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

$("btn-add").addEventListener("click", openAddSheet);

$("btn-settings").addEventListener("click", () => {
  updateLangSeg();
  openSheet("sheet-settings");
});

$("btn-logout").addEventListener("click", async () => {
  const ok = await showConfirm(t("confirmLogout"));
  if (ok) logout();
});

// Library toolbar
document.querySelectorAll("#library-seg .seg").forEach((btn) => {
  btn.addEventListener("click", () => {
    librarySeg = btn.dataset.seg;
    document.querySelectorAll("#library-seg .seg").forEach((x) => {
      x.classList.toggle("active", x === btn);
    });
    renderLibrary();
  });
});

$("library-search").addEventListener("input", (e) => {
  librarySearch = e.target.value;
  renderLibrary();
});

// ========== Language ==========
function updateLangSeg() {
  document.querySelectorAll("#lang-seg .seg").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === userLang);
  });
}

document.querySelectorAll("#lang-seg .seg").forEach((btn) => {
  btn.addEventListener("click", () => {
    setLanguage(btn.dataset.lang);
    updateLangSeg();
  });
});

$("btn-lang-login").addEventListener("click", () => {
  setLanguage(userLang === "pt-BR" ? "en" : "pt-BR");
});

function updateLoginLangButton() {
  $("btn-lang-login").textContent = userLang === "pt-BR" ? "EN" : "PT";
}

window.onLanguageChange = () => {
  updateLoginLangButton();
  detailsCache.clear();
  if (session) {
    render();
    // Recommendations come localized from TMDB — reload them in the new language.
    loadRecommendations();
  }
  trackEvent("language_changed", { new_language: userLang });
};

// ========== Init ==========
async function init() {
  applyTranslations();
  updateLoginLangButton();

  session = loadStoredSession();
  if (session) {
    try {
      await doEnter(session.code, session.password, true);
      return;
    } catch (err) {
      console.warn("Stored session invalid:", err.message);
      session = null;
      clearSession();
    }
  }
  $("login-screen").style.display = "flex";
}

init();
