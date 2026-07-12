/* ============================================================
   CineNotes recommendation engine v2 — "taste-first"

   Design goals (vs v1):
   - No trending source, no recency boost, no raw-popularity boost.
     A movie is recommended because it matches the couple's taste,
     not because it is new or currently hyped.
   - Collaborative signal: TMDB /recommendations + /similar seeded by
     the movies the couple loved (z-score weighted by their own rating
     scale) and by watchlist intent.
   - Content profile: weighted genres/keywords/directors/cast built from
     ALL ratings — including negative weights from movies they disliked.
   - Quality prior: Bayesian-adjusted TMDB score (vote-count shrinkage),
     so acclaimed films rank above barely-voted new releases.
   - Era fit: matches the decades the couple actually watches instead
     of rewarding recent release dates.
   - MMR diversity re-ranking + 2 "hidden gem" slots (high quality,
     outside the dominant genres).

   Request/response contract is unchanged from v1. Each result now also
   carries `basedOn` (title of the strongest contributing seed).
   ============================================================ */

const GENRE_MAP_PT = {
  28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia',
  80: 'Crime', 99: 'Documentário', 18: 'Drama', 10751: 'Família',
  14: 'Fantasia', 36: 'História', 27: 'Terror', 10402: 'Música',
  9648: 'Mistério', 10749: 'Romance', 878: 'Ficção Científica',
  10770: 'Telefilme', 53: 'Suspense', 10752: 'Guerra', 37: 'Faroeste',
};
const GENRE_MAP_EN = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const FETCH_TIMEOUT_MS = 2500;
const MAX_RESULTS = 20;

// Seed limits
const MAX_POSITIVE_SEEDS = 8;
const MAX_WATCHLIST_SEEDS = 3;
const MAX_NEGATIVE_SEEDS = 4;

// Bayesian quality prior: WR = (v/(v+m))*R + (m/(v+m))*C
// m = votes needed for the score to be trusted; C = TMDB global mean.
const QUALITY_M = 300;
const QUALITY_C = 6.6;
// Minimum votes for a candidate to be considered at all (kills
// barely-voted brand-new releases and junk).
const MIN_VOTE_COUNT = 50;

// Final score weights (multiplicative penalties applied after).
const W = Object.freeze({
  seedAffinity: 0.40,
  contentSim: 0.25,
  quality: 0.25,
  eraFit: 0.10,
});

// How much each candidate source contributes to seed affinity.
const SOURCE_WEIGHTS = Object.freeze({
  recommendations: 1.0,
  similar: 0.75,
  watchlistRec: 0.85,
  discoverGenre: 0.35,
  discoverDirector: 0.7,
  discoverKeyword: 0.55,
});

// MMR diversity: adjusted = score - MMR_LAMBDA * maxSimToSelected
const MMR_LAMBDA = 0.22;
const HIDDEN_GEM_SLOTS = 2;

// Module-level caches survive warm lambda invocations.
const seedDetailCache = new Map(); // `${id}:${lang}` -> enriched seed detail
const candDetailCache = new Map(); // `${id}:${lang}` -> {keywordIds, directors, topCast}

// ---------- small utils ----------
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function safeNumber(v, fb = null) { const n = Number(v); return Number.isFinite(n) ? n : fb; }
function average(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function uniqueIds(arr) { return [...new Set((arr || []).map((x) => safeNumber(x, null)).filter(Boolean))]; }
function getYear(d) { return d ? safeNumber(String(d).slice(0, 4), null) : null; }
function jaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const B = new Set(b);
  const inter = a.filter((x) => B.has(x)).length;
  return inter / (new Set([...a, ...b]).size);
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`TMDB ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function buildUrl(apiKey, lang, path, query = {}) {
  const params = new URLSearchParams({ api_key: apiKey, language: lang, ...query });
  return `${TMDB_BASE_URL}${path}?${params.toString()}`;
}

async function fetchList(apiKey, lang, path, query, meta) {
  try {
    const data = await fetchJson(buildUrl(apiKey, lang, path, query));
    return (data.results || []).map((movie) => ({ movie, ...meta }));
  } catch {
    return [];
  }
}

async function mapInBatches(items, batchSize, fn) {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.all(items.slice(i, i + batchSize).map(fn));
  }
}

// ---------- input ----------
function parseInput(body = {}) {
  const exclude = new Set(uniqueIds(body.excludeTmdbIds));
  const dislikedGenreIds = new Set(uniqueIds(body.dislikedGenreIds));

  const signals = Array.isArray(body.seeds)
    ? body.seeds
        .map((s) => {
          const tmdbId = safeNumber(s && s.tmdbId, null);
          if (!tmdbId) return null;
          const signalType = s.signalType === 'watchlist' ? 'watchlist' : 'rating';
          const rating = safeNumber(s.rating, signalType === 'watchlist' ? 6.5 : null);
          if (rating === null) return null;
          return {
            tmdbId,
            rating: clamp(rating, 0, 10),
            signalType,
            genreIds: uniqueIds(s.genreIds),
            title: s.title || '',
            year: getYear(s.year),
            dateAdded: s.dateAdded || '',
          };
        })
        .filter(Boolean)
    : [];

  // Genres the couple keeps dismissing recommendations of.
  const dismissedGenreCounts = new Map();
  (Array.isArray(body.dismissedWithGenres) ? body.dismissedWithGenres : []).forEach((d) => {
    uniqueIds(d && d.genreIds).forEach((g) => {
      dismissedGenreCounts.set(g, (dismissedGenreCounts.get(g) || 0) + 1);
    });
  });

  return { signals, exclude, dislikedGenreIds, dismissedGenreCounts };
}

// ---------- profile ----------
function timeDecay(dateAdded) {
  if (!dateAdded) return 1;
  const ms = new Date(dateAdded).getTime();
  if (Number.isNaN(ms)) return 1;
  const days = Math.max(0, (Date.now() - ms) / 86400000);
  // Taste changes slowly: half-life ~2 years, floor 0.5.
  return 0.5 + 0.5 * Math.exp(-days / 730);
}

function buildProfile(signals) {
  const ratingSignals = signals.filter((s) => s.signalType === 'rating');
  const ratings = ratingSignals.map((s) => s.rating);
  const mean = ratings.length ? average(ratings) : 6.5;
  const std = Math.max(
    0.75,
    Math.sqrt(average(ratings.map((r) => (r - mean) ** 2)))
  );

  const weighted = signals.map((s) => {
    const z =
      s.signalType === 'watchlist'
        ? 0.6 // intent: positive but weaker than a real high rating
        : clamp((s.rating - mean) / std, -2.5, 2.5);
    return { ...s, weight: z * timeDecay(s.dateAdded) };
  });

  const positiveSeeds = weighted
    .filter((s) => s.signalType === 'rating' && s.weight > 0.1)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_POSITIVE_SEEDS);

  const watchlistSeeds = weighted
    .filter((s) => s.signalType === 'watchlist')
    .sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''))
    .slice(0, MAX_WATCHLIST_SEEDS);

  const negativeSeeds = weighted
    .filter((s) => s.signalType === 'rating' && s.weight < -0.6)
    .sort((a, b) => a.weight - b.weight)
    .slice(0, MAX_NEGATIVE_SEEDS);

  // Weighted taste vectors. Genres come free from the client; keywords
  // and crew are added by enrichProfile() below.
  const genreW = new Map();
  weighted.forEach((s) => {
    s.genreIds.forEach((g) => genreW.set(g, (genreW.get(g) || 0) + s.weight));
  });

  // Decade histogram of what they actually watch (positive signals only).
  const decadeW = new Map();
  weighted.forEach((s) => {
    if (s.weight <= 0 || !s.year) return;
    const d = Math.floor(s.year / 10) * 10;
    decadeW.set(d, (decadeW.get(d) || 0) + s.weight);
  });

  const dominantGenres = [...genreW.entries()]
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  return {
    hasSignals: weighted.length > 0,
    mean,
    std,
    signals: weighted,
    positiveSeeds,
    watchlistSeeds,
    negativeSeeds,
    genreW,
    keywordW: new Map(),
    directorW: new Map(),
    castW: new Map(),
    decadeW,
    dominantGenres,
  };
}

// One TMDB call per seed (details + credits + keywords together).
async function fetchSeedDetail(apiKey, lang, tmdbId) {
  const key = `${tmdbId}:${lang}`;
  if (seedDetailCache.has(key)) return seedDetailCache.get(key);
  try {
    const data = await fetchJson(
      buildUrl(apiKey, lang, `/movie/${encodeURIComponent(tmdbId)}`, {
        append_to_response: 'keywords,credits',
      })
    );
    const detail = {
      keywordIds: ((data.keywords || {}).keywords || []).map((k) => k.id).filter(Boolean),
      directors: ((data.credits || {}).crew || [])
        .filter((c) => c.job === 'Director')
        .map((c) => c.id),
      topCast: ((data.credits || {}).cast || []).slice(0, 5).map((c) => c.id),
    };
    seedDetailCache.set(key, detail);
    return detail;
  } catch {
    return { keywordIds: [], directors: [], topCast: [] };
  }
}

async function enrichProfile(apiKey, lang, profile) {
  const seeds = [...profile.positiveSeeds, ...profile.watchlistSeeds, ...profile.negativeSeeds];
  await mapInBatches(seeds, 8, async (seed) => {
    const d = await fetchSeedDetail(apiKey, lang, seed.tmdbId);
    seed.keywordIds = d.keywordIds;
    seed.directors = d.directors;
    seed.topCast = d.topCast;
    d.keywordIds.forEach((k) =>
      profile.keywordW.set(k, (profile.keywordW.get(k) || 0) + seed.weight)
    );
    d.directors.forEach((p) =>
      profile.directorW.set(p, (profile.directorW.get(p) || 0) + seed.weight * 1.5)
    );
    d.topCast.forEach((p) =>
      profile.castW.set(p, (profile.castW.get(p) || 0) + seed.weight * 0.6)
    );
  });
}

// ---------- candidate generation ----------
async function fetchCandidates(apiKey, lang, profile) {
  const requests = [];

  profile.positiveSeeds.forEach((seed) => {
    const meta = { seedWeight: seed.weight, seedTitle: seed.title };
    requests.push(
      fetchList(apiKey, lang, `/movie/${seed.tmdbId}/recommendations`, { page: '1' },
        { source: 'recommendations', ...meta }),
      fetchList(apiKey, lang, `/movie/${seed.tmdbId}/similar`, { page: '1' },
        { source: 'similar', ...meta })
    );
  });

  profile.watchlistSeeds.forEach((seed) => {
    requests.push(
      fetchList(apiKey, lang, `/movie/${seed.tmdbId}/recommendations`, { page: '1' },
        { source: 'watchlistRec', seedWeight: seed.weight, seedTitle: seed.title })
    );
  });

  // Targeted discovery — always rating-sorted with vote floors, never
  // popularity-sorted, never trending.
  const topGenres = profile.dominantGenres.slice(0, 2);
  topGenres.forEach((g) => {
    requests.push(
      fetchList(apiKey, lang, '/discover/movie', {
        page: '1',
        include_adult: 'false',
        sort_by: 'vote_average.desc',
        'vote_count.gte': '500',
        with_genres: String(g),
      }, { source: 'discoverGenre', seedWeight: 0.5, seedTitle: '' })
    );
  });
  if (topGenres.length >= 2) {
    requests.push(
      fetchList(apiKey, lang, '/discover/movie', {
        page: '1',
        include_adult: 'false',
        sort_by: 'vote_average.desc',
        'vote_count.gte': '300',
        with_genres: topGenres.join(','),
      }, { source: 'discoverGenre', seedWeight: 0.6, seedTitle: '' })
    );
  }

  const topDirectors = [...profile.directorW.entries()]
    .filter(([, w]) => w > 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => id);
  if (topDirectors.length) {
    requests.push(
      fetchList(apiKey, lang, '/discover/movie', {
        page: '1',
        include_adult: 'false',
        sort_by: 'vote_average.desc',
        'vote_count.gte': '100',
        with_crew: topDirectors.join('|'),
      }, { source: 'discoverDirector', seedWeight: 0.8, seedTitle: '' })
    );
  }

  const topKeywords = [...profile.keywordW.entries()]
    .filter(([, w]) => w > 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  if (topKeywords.length) {
    requests.push(
      fetchList(apiKey, lang, '/discover/movie', {
        page: '1',
        include_adult: 'false',
        sort_by: 'vote_average.desc',
        'vote_count.gte': '200',
        with_keywords: topKeywords.join('|'),
      }, { source: 'discoverKeyword', seedWeight: 0.6, seedTitle: '' })
    );
  }

  return (await Promise.all(requests)).flat();
}

function mergeCandidates(raw, exclude) {
  const map = new Map();
  raw.forEach(({ movie, source, seedWeight, seedTitle }) => {
    if (!movie || !movie.id || exclude.has(movie.id)) return;
    if (movie.adult) return;
    if (safeNumber(movie.vote_count, 0) < MIN_VOTE_COUNT) return;

    const entry = map.get(movie.id) || {
      movie,
      frequency: 0,
      affinityRaw: 0,
      contributors: [],
      genreIds: uniqueIds(movie.genre_ids),
    };
    entry.movie = { ...entry.movie, ...movie };
    entry.genreIds = uniqueIds(entry.movie.genre_ids && entry.movie.genre_ids.length ? entry.movie.genre_ids : entry.genreIds);
    entry.frequency += 1;
    const contribution = (SOURCE_WEIGHTS[source] || 0.4) * Math.max(0.15, seedWeight || 0);
    entry.affinityRaw += contribution;
    if (seedTitle) entry.contributors.push({ title: seedTitle, contribution });
    map.set(movie.id, entry);
  });
  return [...map.values()];
}

// ---------- scoring ----------
function bayesianQuality(movie) {
  const v = safeNumber(movie.vote_count, 0);
  const r = safeNumber(movie.vote_average, 0);
  const wr = (v / (v + QUALITY_M)) * r + (QUALITY_M / (v + QUALITY_M)) * QUALITY_C;
  // Map ~[5.0 .. 8.5] onto [0 .. 1]
  return clamp((wr - 5) / 3.5, 0, 1);
}

function vectorScore(ids, weights) {
  // Average signed weight of the candidate's attributes, normalized by
  // the profile's strongest weight -> roughly [-1, 1].
  if (!ids.length || !weights.size) return 0;
  const maxAbs = Math.max(...[...weights.values()].map(Math.abs), 0.001);
  let sum = 0;
  let hits = 0;
  ids.forEach((id) => {
    const w = weights.get(id);
    if (w !== undefined) { sum += w / maxAbs; hits += 1; }
  });
  if (!hits) return 0;
  // Dampen single-attribute matches.
  return clamp((sum / ids.length) * Math.min(1, hits / 2 + 0.5), -1, 1);
}

function contentSimilarity(cand, profile) {
  const genre = vectorScore(cand.genreIds, profile.genreW);
  const keyword = vectorScore(cand.keywordIds || [], profile.keywordW);
  let crew = 0;
  if (cand.directors || cand.topCast) {
    const dirHit = (cand.directors || []).reduce((s, d) => s + (profile.directorW.get(d) || 0), 0);
    const castHit = (cand.topCast || []).reduce((s, c) => s + (profile.castW.get(c) || 0), 0);
    crew = clamp(dirHit / 2 + castHit / 4, -1, 1);
  }
  const signed = 0.45 * genre + 0.4 * keyword + 0.15 * crew;
  return { normalized: clamp((signed + 1) / 2, 0, 1), signed };
}

function eraFit(cand, profile) {
  if (!profile.decadeW.size) return 0.5; // neutral
  const year = getYear(cand.movie.release_date);
  if (!year) return 0.4;
  const d = Math.floor(year / 10) * 10;
  const smoothed =
    (profile.decadeW.get(d) || 0) +
    0.35 * (profile.decadeW.get(d - 10) || 0) +
    0.35 * (profile.decadeW.get(d + 10) || 0);
  const max = Math.max(...profile.decadeW.values(), 0.001);
  return clamp(smoothed / max, 0, 1);
}

function scoreCandidates(candidates, profile, dislikedGenreIds, dismissedGenreCounts) {
  const maxAffinity = Math.max(...candidates.map((c) => c.affinityRaw), 0.001);

  return candidates
    .map((c) => {
      const seedAffinity = Math.log1p(c.affinityRaw) / Math.log1p(maxAffinity);
      const content = contentSimilarity(c, profile);
      const quality = bayesianQuality(c.movie);
      const era = eraFit(c, profile);

      let score =
        W.seedAffinity * seedAffinity +
        W.contentSim * content.normalized +
        W.quality * quality +
        W.eraFit * era;

      // Hard taste penalties (multiplicative).
      const dislikedHits = c.genreIds.filter((g) => dislikedGenreIds.has(g)).length;
      if (dislikedHits) score *= Math.pow(0.7, dislikedHits);

      // Similarity to explicitly disliked content.
      if (content.signed < -0.15) score *= 0.75;

      // Recommendation fatigue: genres they keep dismissing.
      c.genreIds.forEach((g) => {
        if ((dismissedGenreCounts.get(g) || 0) >= 3) score *= 0.9;
      });

      const basedOn = c.contributors.length
        ? c.contributors.sort((a, b) => b.contribution - a.contribution)[0].title
        : '';

      return { ...c, score, quality, contentSigned: content.signed, dislikedHits, basedOn };
    })
    .sort((a, b) => b.score - a.score);
}

// Movies in explicitly disliked genres only survive if they are
// exceptional matches anyway (e.g. strongly recommended by loved seeds).
function dropDisliked(ranked) {
  if (!ranked.length) return ranked;
  const top = ranked[0].score;
  return ranked.filter((c) => !c.dislikedHits || c.score >= 0.75 * top);
}

// ---------- selection: MMR diversity + hidden gems ----------
function candidateSim(a, b) {
  return (
    0.65 * jaccard(a.genreIds, b.genreIds) +
    0.35 * jaccard(a.keywordIds || [], b.keywordIds || [])
  );
}

function selectWithDiversity(ranked, profile) {
  const pool = [...ranked];
  const selected = [];
  const mmrTarget = MAX_RESULTS - HIDDEN_GEM_SLOTS;

  while (pool.length && selected.length < mmrTarget) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    pool.forEach((cand, i) => {
      const maxSim = selected.length
        ? Math.max(...selected.map((s) => candidateSim(cand, s)))
        : 0;
      const val = cand.score - MMR_LAMBDA * maxSim;
      if (val > bestVal) { bestVal = val; bestIdx = i; }
    });
    selected.push(pool.splice(bestIdx, 1)[0]);
  }

  // Hidden gems: the best-rated films OUTSIDE the couple's dominant
  // genres — quality-driven exploration instead of trending noise.
  const dominant = new Set(profile.dominantGenres.slice(0, 3));
  const gems = pool
    .filter((c) => c.quality >= 0.55 && !c.genreIds.some((g) => dominant.has(g)))
    .sort((a, b) => b.quality - a.quality)
    .slice(0, HIDDEN_GEM_SLOTS);
  selected.push(...gems);

  // Fill any remaining slots from the pool by score.
  for (const c of pool) {
    if (selected.length >= MAX_RESULTS) break;
    if (!selected.includes(c)) selected.push(c);
  }
  return selected.slice(0, MAX_RESULTS);
}

// ---------- output ----------
function mapMovie(genreMap, cand) {
  const m = cand.movie || cand;
  return {
    tmdbId: m.id,
    title: m.title,
    year: m.release_date ? String(m.release_date).slice(0, 4) : '',
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
    posterThumb: m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : '',
    genre: uniqueIds(m.genre_ids).map((g) => genreMap[g]).filter(Boolean).join(', '),
    overview: m.overview || '',
    voteAverage: m.vote_average || 0,
    score: cand.score !== undefined ? Math.round(cand.score * 100) / 10 : undefined,
    basedOn: cand.basedOn || '',
  };
}

// Cold start: acclaimed classics + current favorites, still vote-floored.
async function coldStart(apiKey, lang, exclude, genreMap) {
  const [topRated, trending] = await Promise.all([
    fetchList(apiKey, lang, '/movie/top_rated', { page: '1' }, {}),
    fetchList(apiKey, lang, '/trending/movie/week', { page: '1' }, {}),
  ]);
  const seen = new Set();
  const results = [];
  [...topRated, ...trending].forEach(({ movie }) => {
    if (!movie || !movie.id || exclude.has(movie.id) || seen.has(movie.id)) return;
    if (safeNumber(movie.vote_count, 0) < MIN_VOTE_COUNT) return;
    seen.add(movie.id);
    results.push(mapMovie(genreMap, { movie }));
  });
  return results.slice(0, MAX_RESULTS);
}

// ---------- handler ----------
async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TMDB_API_KEY não configurada no servidor.' });
    }

    const body = req.body || {};
    const lang = body.lang === 'en' ? 'en-US' : 'pt-BR';
    const genreMap = body.lang === 'en' ? GENRE_MAP_EN : GENRE_MAP_PT;

    const input = parseInput(body);
    const profile = buildProfile(input.signals);

    if (profile.hasSignals && (profile.positiveSeeds.length || profile.watchlistSeeds.length)) {
      await enrichProfile(apiKey, lang, profile);

      const raw = await fetchCandidates(apiKey, lang, profile);
      const merged = mergeCandidates(raw, input.exclude);

      // Enrich the most promising candidates with keywords + credits
      // (one TMDB call each, cached across invocations).
      const prelim = merged
        .map((c) => ({ c, p: c.affinityRaw + bayesianQuality(c.movie) }))
        .sort((a, b) => b.p - a.p)
        .slice(0, 50)
        .map((x) => x.c);
      await mapInBatches(prelim, 10, async (cand) => {
        const d = await fetchSeedDetail(apiKey, lang, cand.movie.id);
        cand.keywordIds = d.keywordIds;
        cand.directors = d.directors;
        cand.topCast = d.topCast;
      });

      const ranked = dropDisliked(
        scoreCandidates(prelim, profile, input.dislikedGenreIds, input.dismissedGenreCounts)
      );
      const selected = selectWithDiversity(ranked, profile);
      const results = selected.map((c) => mapMovie(genreMap, c));

      if (results.length > 0) {
        return res.status(200).json({ results, type: 'personalized' });
      }
    }

    const results = await coldStart(apiKey, lang, input.exclude, genreMap);
    return res.status(200).json({ results, type: 'trending' });
  } catch (err) {
    console.error('Erro em /api/recommendations:', err);
    return res.status(500).json({ error: 'Erro ao buscar recomendações: ' + err.message });
  }
}

module.exports = handler;
// Exposed for tests only.
module.exports._internals = {
  parseInput,
  buildProfile,
  mergeCandidates,
  scoreCandidates,
  dropDisliked,
  selectWithDiversity,
  bayesianQuality,
  eraFit,
  contentSimilarity,
};
