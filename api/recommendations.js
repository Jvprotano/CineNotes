const GENRE_MAP = {
  28: 'A\u00e7\u00e3o',
  12: 'Aventura',
  16: 'Anima\u00e7\u00e3o',
  35: 'Com\u00e9dia',
  80: 'Crime',
  99: 'Document\u00e1rio',
  18: 'Drama',
  10751: 'Fam\u00edlia',
  14: 'Fantasia',
  36: 'Hist\u00f3ria',
  27: 'Terror',
  10402: 'M\u00fasica',
  9648: 'Mist\u00e9rio',
  10749: 'Romance',
  878: 'Fic\u00e7\u00e3o Cient\u00edfica',
  10770: 'Telefilme',
  53: 'Suspense',
  10752: 'Guerra',
  37: 'Faroeste',
};

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_LANGUAGE = 'pt-BR';
const FETCH_TIMEOUT_MS = 1500;
const MAX_RESULTS = 20;
const CANDIDATE_SEED_LIMIT = 4;
const DISCOVER_GENRE_LIMIT = 2;
const WATCHLIST_EQUIVALENT_RATING = 7.5;
const DEFAULT_MEAN_RATING = 6.5;
const EXPLORATION_RATIO = 0.2;

const SOURCE_WEIGHTS = Object.freeze({
  recommendations: 1,
  similar: 0.9,
  discover: 0.7,
  trending: 0.55,
});

// Similarity drives rank, while TMDB quality signals refine tie-breaking.
const SCORE_WEIGHTS = Object.freeze({
  weightedSimilarity: 0.46,
  frequency: 0.18,
  tmdbVoteAverage: 0.16,
  popularity: 0.1,
  recency: 0.1,
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function safeNumber(value, fallback = null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeLog(value, maxValue) {
  if (!maxValue || maxValue <= 0) return 0;
  return Math.log1p(Math.max(0, value)) / Math.log1p(maxValue);
}

function getYear(releaseDate) {
  return releaseDate ? String(releaseDate).slice(0, 4) : '';
}

function recencyScore(releaseDate) {
  if (!releaseDate) return 0.2;
  const releaseYear = safeNumber(String(releaseDate).slice(0, 4), null);
  if (!releaseYear) return 0.2;

  const currentYear = new Date().getUTCFullYear();
  const age = Math.max(0, currentYear - releaseYear);
  return clamp(1 - age / 25, 0, 1);
}

function uniqueGenreIds(genreIds) {
  return [...new Set((genreIds || []).map(id => safeNumber(id, null)).filter(Boolean))];
}

function genreLabel(genreIds) {
  return uniqueGenreIds(genreIds)
    .map(id => GENRE_MAP[id])
    .filter(Boolean)
    .join(', ');
}

function mapMovie(movie, score) {
  return {
    tmdbId: movie.id,
    title: movie.title,
    year: getYear(movie.release_date),
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
    posterThumb: movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : '',
    genre: genreLabel(movie.genre_ids),
    overview: movie.overview || '',
    voteAverage: movie.vote_average || 0,
    score: score !== undefined ? Math.round(score * 10) / 10 : undefined,
  };
}

function buildTmdbUrl(apiKey, path, query = {}) {
  const params = new URLSearchParams({
    api_key: apiKey,
    language: TMDB_LANGUAGE,
    ...query,
  });
  return `${TMDB_BASE_URL}${path}?${params.toString()}`;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`TMDB ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTmdbList(apiKey, path, query, metadata) {
  try {
    const url = buildTmdbUrl(apiKey, path, query);
    const data = await fetchJson(url);
    return (data.results || []).map(movie => ({ movie, ...metadata }));
  } catch {
    return [];
  }
}

function jaccardSimilarity(leftGenres, rightGenres) {
  const left = uniqueGenreIds(leftGenres);
  const right = uniqueGenreIds(rightGenres);

  if (!left.length || !right.length) return 0;

  const rightSet = new Set(right);
  const intersection = left.filter(id => rightSet.has(id)).length;
  const union = new Set([...left, ...right]).size;
  return union > 0 ? intersection / union : 0;
}

function getUserData(body = {}) {
  const exclude = new Set((body.excludeTmdbIds || []).map(id => safeNumber(id, null)).filter(Boolean));
  const dislikedGenreIds = new Set((body.dislikedGenreIds || []).map(id => safeNumber(id, null)).filter(Boolean));

  const signals = Array.isArray(body.seeds)
    ? body.seeds
        .map(seed => {
          const tmdbId = safeNumber(seed && seed.tmdbId, null);
          if (!tmdbId) return null;

          const signalType = seed.signalType === 'watchlist' ? 'watchlist' : 'rating';
          const fallbackRating = signalType === 'watchlist' ? WATCHLIST_EQUIVALENT_RATING : null;
          const rating = safeNumber(seed.rating, fallbackRating);
          if (rating === null) return null;

          return {
            tmdbId,
            rating: clamp(rating, 0, 10),
            signalType,
            genreIds: uniqueGenreIds(seed.genreIds),
            title: seed.title || '',
            year: seed.year || '',
          };
        })
        .filter(Boolean)
    : [];

  return { signals, exclude, dislikedGenreIds };
}

function buildUserProfile(userData) {
  const ratingSignals = userData.signals.filter(signal => signal.signalType === 'rating');
  const meanRating = ratingSignals.length
    ? average(ratingSignals.map(signal => signal.rating))
    : DEFAULT_MEAN_RATING;

  const genreWeights = new Map();
  const signalById = new Map();

  const normalizedSignals = userData.signals.map(signal => {
    const weightBase = signal.rating - meanRating;
    const boostedWeight = signal.signalType === 'watchlist'
      ? Math.max(0.9, weightBase + 0.9)
      : weightBase;

    const normalizedSignal = {
      ...signal,
      weight: Math.round(boostedWeight * 1000) / 1000,
    };

    signalById.set(signal.tmdbId, normalizedSignal);

    normalizedSignal.genreIds.forEach(genreId => {
      const genreBoost = normalizedSignal.signalType === 'watchlist' ? 1.15 : 1;
      genreWeights.set(genreId, (genreWeights.get(genreId) || 0) + normalizedSignal.weight * genreBoost);
    });

    return normalizedSignal;
  });

  const dominantGenres = [...genreWeights.entries()]
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([genreId]) => genreId)
    .slice(0, 3);

  const relevantSeeds = normalizedSignals
    .filter(signal => signal.signalType === 'watchlist' || signal.weight > 0)
    .sort((a, b) => {
      const aStrength = (a.signalType === 'watchlist' ? 1.25 : 1) * (Math.abs(a.weight) + 0.25);
      const bStrength = (b.signalType === 'watchlist' ? 1.25 : 1) * (Math.abs(b.weight) + 0.25);
      return bStrength - aStrength;
    })
    .slice(0, CANDIDATE_SEED_LIMIT);

  return {
    hasSignals: normalizedSignals.length > 0,
    meanRating,
    signals: normalizedSignals,
    signalById,
    genreWeights,
    dominantGenres,
    dominantGenresSet: new Set(dominantGenres),
    topGenres: dominantGenres.slice(0, DISCOVER_GENRE_LIMIT),
    relevantSeeds,
  };
}

async function fetchCandidates(apiKey, userProfile) {
  const requests = [];

  userProfile.relevantSeeds.forEach(seed => {
    const seedWeight = Math.max(0, seed.weight);
    requests.push(
      fetchTmdbList(
        apiKey,
        `/movie/${encodeURIComponent(seed.tmdbId)}/recommendations`,
        { page: '1' },
        { source: 'recommendations', seedTmdbId: seed.tmdbId, seedWeight }
      )
    );
    requests.push(
      fetchTmdbList(
        apiKey,
        `/movie/${encodeURIComponent(seed.tmdbId)}/similar`,
        { page: '1' },
        { source: 'similar', seedTmdbId: seed.tmdbId, seedWeight }
      )
    );
  });

  userProfile.topGenres.forEach(genreId => {
    requests.push(
      fetchTmdbList(
        apiKey,
        '/discover/movie',
        {
          page: '1',
          include_adult: 'false',
          sort_by: 'popularity.desc',
          with_genres: String(genreId),
          'vote_count.gte': '80',
        },
        { source: 'discover', genreFocus: genreId, seedWeight: 0 }
      )
    );
  });

  requests.push(
    fetchTmdbList(
      apiKey,
      '/trending/movie/week',
      { page: '1' },
      { source: 'trending', seedWeight: 0 }
    )
  );

  const resultBatches = await Promise.all(requests);
  return resultBatches.flat();
}

function mergeMovieData(currentMovie, nextMovie) {
  if (!currentMovie) return nextMovie;

  return {
    ...currentMovie,
    ...nextMovie,
    genre_ids: uniqueGenreIds(nextMovie.genre_ids && nextMovie.genre_ids.length ? nextMovie.genre_ids : currentMovie.genre_ids),
    overview: nextMovie.overview || currentMovie.overview || '',
    poster_path: nextMovie.poster_path || currentMovie.poster_path || '',
  };
}

function mergeAndDeduplicate(rawCandidates, exclude) {
  const candidates = new Map();

  rawCandidates.forEach(({ movie, source, seedTmdbId, seedWeight, genreFocus }) => {
    if (!movie || !movie.id || exclude.has(movie.id)) return;

    const genreIds = uniqueGenreIds(movie.genre_ids);
    const entry = candidates.get(movie.id) || {
      movie: null,
      frequency: 0,
      sourceWeight: 0,
      sources: new Set(),
      seedContributors: new Set(),
      seedWeight: 0,
      genreFocusHits: new Set(),
      genreIds,
    };

    entry.movie = mergeMovieData(entry.movie, movie);
    entry.frequency += 1;
    entry.sourceWeight += SOURCE_WEIGHTS[source] || 0.5;
    entry.sources.add(source);
    entry.genreIds = uniqueGenreIds(entry.movie.genre_ids);

    if (seedTmdbId) entry.seedContributors.add(seedTmdbId);
    if (seedWeight) entry.seedWeight += seedWeight;
    if (genreFocus) entry.genreFocusHits.add(genreFocus);

    candidates.set(movie.id, entry);
  });

  return [...candidates.values()];
}

function computeWeightedSimilarity(candidate, userProfile) {
  const candidateGenres = candidate.genreIds;
  if (!candidateGenres.length || !userProfile.signals.length) return 0.5;

  let weightedSimilarity = 0;
  let totalMagnitude = 0;

  userProfile.signals.forEach(signal => {
    if (!signal.genreIds.length) return;

    const similarity = jaccardSimilarity(candidateGenres, signal.genreIds);
    if (similarity <= 0) return;

    const minimumWeight = signal.signalType === 'watchlist' ? 0.9 : 0;
    const signedWeight = signal.weight >= 0
      ? Math.max(signal.weight, minimumWeight)
      : signal.weight;

    weightedSimilarity += similarity * signedWeight;
    totalMagnitude += Math.abs(signedWeight);
  });

  const rawSimilarity = totalMagnitude > 0 ? weightedSimilarity / totalMagnitude : 0;
  const positiveSeedWeights = [...candidate.seedContributors]
    .map(seedId => userProfile.signalById.get(seedId))
    .filter(Boolean)
    .map(signal => Math.max(signal.weight, 0));
  const sourceAffinity = positiveSeedWeights.length
    ? Math.min(0.12, average(positiveSeedWeights) / 20)
    : 0;

  return clamp((rawSimilarity + 1) / 2 + sourceAffinity, 0, 1);
}

function computeScores(candidates, userProfile, dislikedGenreIds) {
  if (!candidates.length) return [];

  const maxFrequency = Math.max(...candidates.map(candidate => candidate.frequency), 1);
  const maxPopularity = Math.max(...candidates.map(candidate => safeNumber(candidate.movie.popularity, 0)), 1);

  return candidates
    .map(candidate => {
      const weightedSimilarity = computeWeightedSimilarity(candidate, userProfile);
      const frequency = candidate.frequency / maxFrequency;
      const tmdbVoteAverage = clamp((safeNumber(candidate.movie.vote_average, 0) || 0) / 10, 0, 1);
      const popularity = normalizeLog(safeNumber(candidate.movie.popularity, 0), maxPopularity);
      const recency = recencyScore(candidate.movie.release_date);

      let score =
        SCORE_WEIGHTS.weightedSimilarity * weightedSimilarity +
        SCORE_WEIGHTS.frequency * frequency +
        SCORE_WEIGHTS.tmdbVoteAverage * tmdbVoteAverage +
        SCORE_WEIGHTS.popularity * popularity +
        SCORE_WEIGHTS.recency * recency;

      const dislikedCount = candidate.genreIds.filter(genreId => dislikedGenreIds.has(genreId)).length;
      if (dislikedCount > 0) {
        score *= Math.pow(0.7, dislikedCount);
      }

      const dominantOverlap = candidate.genreIds.some(genreId => userProfile.dominantGenresSet.has(genreId));
      const explorationScore =
        score +
        (!dominantOverlap ? 0.08 : 0) +
        (tmdbVoteAverage >= 0.7 ? 0.04 : 0) -
        popularity * 0.08;

      return {
        ...candidate,
        score: score * 10,
        explorationScore: explorationScore * 10,
        dominantOverlap,
        metrics: {
          weightedSimilarity,
          frequency,
          tmdbVoteAverage,
          popularity,
          recency,
        },
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.metrics.weightedSimilarity !== left.metrics.weightedSimilarity) {
        return right.metrics.weightedSimilarity - left.metrics.weightedSimilarity;
      }
      return (right.movie.vote_average || 0) - (left.movie.vote_average || 0);
    });
}

function isExplorationCandidate(candidate, userProfile) {
  const voteAverage = candidate.metrics.tmdbVoteAverage;
  const popularity = candidate.metrics.popularity;
  const outsideDominantGenres = !candidate.dominantOverlap;

  return (outsideDominantGenres || popularity < 0.45) && voteAverage >= 0.62;
}

function applyExploration(rankedCandidates, userProfile) {
  if (!rankedCandidates.length) return [];

  const explorationTarget = Math.max(1, Math.round(MAX_RESULTS * EXPLORATION_RATIO));
  const selectedIds = new Set();
  const exploration = [];

  rankedCandidates
    .filter(candidate => isExplorationCandidate(candidate, userProfile))
    .sort((left, right) => right.explorationScore - left.explorationScore)
    .forEach(candidate => {
      if (exploration.length >= explorationTarget || selectedIds.has(candidate.movie.id)) return;
      exploration.push({ ...candidate, isExploration: true });
      selectedIds.add(candidate.movie.id);
    });

  const primary = rankedCandidates
    .filter(candidate => !selectedIds.has(candidate.movie.id))
    .slice(0, MAX_RESULTS * 2)
    .map(candidate => ({ ...candidate, isExploration: false }));

  return [...primary, ...exploration];
}

function hasGenreOverlap(leftGenres, rightGenres) {
  const rightSet = new Set(rightGenres || []);
  return (leftGenres || []).some(genreId => rightSet.has(genreId));
}

function rerankWithDiversity(candidates) {
  const pool = [...candidates];
  const results = [];
  const genreCounts = new Map();
  const explorationTarget = Math.max(1, Math.round(MAX_RESULTS * EXPLORATION_RATIO));
  let explorationCount = 0;

  while (pool.length > 0 && results.length < MAX_RESULTS) {
    const last = results[results.length - 1];
    const secondLast = results[results.length - 2];
    let bestIndex = 0;
    let bestAdjustedScore = Number.NEGATIVE_INFINITY;

    pool.forEach((candidate, index) => {
      let adjustedScore = candidate.score;

      if (last && hasGenreOverlap(last.genreIds, candidate.genreIds)) adjustedScore -= 0.9;
      if (secondLast && hasGenreOverlap(secondLast.genreIds, candidate.genreIds)) adjustedScore -= 0.35;

      candidate.genreIds.forEach(genreId => {
        adjustedScore -= (genreCounts.get(genreId) || 0) * 0.18;
      });

      if (candidate.isExploration && explorationCount < explorationTarget) {
        adjustedScore += 0.45;
      }

      const remainingSlots = MAX_RESULTS - results.length;
      const remainingExploration = explorationTarget - explorationCount;
      if (!candidate.isExploration && remainingExploration > 0 && remainingSlots <= remainingExploration) {
        adjustedScore -= 0.8;
      }

      if (adjustedScore > bestAdjustedScore) {
        bestAdjustedScore = adjustedScore;
        bestIndex = index;
      }
    });

    const [selected] = pool.splice(bestIndex, 1);
    selected.genreIds.forEach(genreId => {
      genreCounts.set(genreId, (genreCounts.get(genreId) || 0) + 1);
    });
    if (selected.isExploration) explorationCount += 1;
    results.push(selected);
  }

  return results;
}

function returnTopResults(candidates) {
  return candidates.slice(0, MAX_RESULTS).map(candidate => mapMovie(candidate.movie, candidate.score));
}

async function fetchTrendingFallback(apiKey, exclude) {
  const rawCandidates = await fetchTmdbList(
    apiKey,
    '/trending/movie/week',
    { page: '1' },
    { source: 'trending', seedWeight: 0 }
  );

  return rawCandidates
    .filter(({ movie }) => movie && movie.id && !exclude.has(movie.id))
    .slice(0, MAX_RESULTS)
    .map(({ movie }) => mapMovie(movie));
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Metodo nao permitido' });
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TMDB_API_KEY nao configurada no servidor.' });
    }

    const userData = getUserData(req.body || {});
    const userProfile = buildUserProfile(userData);

    if (userProfile.hasSignals) {
      const rawCandidates = await fetchCandidates(apiKey, userProfile);
      const mergedCandidates = mergeAndDeduplicate(rawCandidates, userData.exclude);
      const scoredCandidates = computeScores(mergedCandidates, userProfile, userData.dislikedGenreIds);
      const explorationPool = applyExploration(scoredCandidates, userProfile);
      const rerankedCandidates = rerankWithDiversity(explorationPool);
      const results = returnTopResults(rerankedCandidates);

      if (results.length > 0) {
        return res.status(200).json({ results, type: 'personalized' });
      }
    }

    const results = await fetchTrendingFallback(apiKey, userData.exclude);
    return res.status(200).json({ results, type: 'trending' });
  } catch (err) {
    console.error('Erro em /api/recommendations:', err);
    return res.status(500).json({ error: 'Erro ao buscar recomendacoes: ' + err.message });
  }
};
