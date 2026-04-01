const GENRE_MAP = {
  28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia',
  80: 'Crime', 99: 'Documentário', 18: 'Drama', 10751: 'Família',
  14: 'Fantasia', 36: 'História', 27: 'Terror', 10402: 'Música',
  9648: 'Mistério', 10749: 'Romance', 878: 'Ficção Científica',
  10770: 'Telefilme', 53: 'Suspense', 10752: 'Guerra', 37: 'Faroeste',
};

function mapMovie(m) {
  return {
    tmdbId: m.id,
    title: m.title,
    year: m.release_date ? m.release_date.slice(0, 4) : '',
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
    posterThumb: m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : '',
    genre: (m.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean).join(', '),
    overview: m.overview || '',
    voteAverage: m.vote_average || 0,
  };
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TMDB_API_KEY não configurada no servidor.' });
    }

    const { genreIds, excludeGenreIds, excludeTmdbIds, topMovieTmdbIds } = req.body || {};
    const exclude = new Set(excludeTmdbIds || []);
    const seen = new Set();

    function dedup(movie) {
      if (exclude.has(movie.id) || seen.has(movie.id)) return false;
      seen.add(movie.id);
      return true;
    }

    // Strategy 1: TMDB movie-based recommendations from top-rated movies
    if (topMovieTmdbIds && topMovieTmdbIds.length > 0) {
      const allResults = [];

      // Fetch recommendations for up to 5 top-rated movies in parallel
      const seeds = topMovieTmdbIds.slice(0, 5);
      const fetches = seeds.map(async (tmdbId) => {
        const url = `https://api.themoviedb.org/3/movie/${encodeURIComponent(tmdbId)}/recommendations?api_key=${encodeURIComponent(apiKey)}&language=pt-BR&page=1`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          return data.results || [];
        } catch {
          return [];
        }
      });

      const resultSets = await Promise.all(fetches);
      for (const results of resultSets) {
        for (const m of results) {
          if (dedup(m)) allResults.push(m);
        }
      }

      // Filter out excluded genres if provided
      let filtered = allResults;
      if (excludeGenreIds && excludeGenreIds.length > 0) {
        const excludeSet = new Set(excludeGenreIds);
        filtered = allResults.filter(m => {
          const movieGenres = m.genre_ids || [];
          // Exclude if ALL genres are in the excluded set (don't be too aggressive)
          return !movieGenres.every(g => excludeSet.has(g));
        });
      }

      if (filtered.length >= 5) {
        return res.status(200).json({
          results: filtered.slice(0, 20).map(mapMovie),
          type: 'personalized',
        });
      }
      // If not enough results from movie-based recs, fall through to discover
    }

    // Strategy 2: Genre-based discover with weighted genres and exclusions
    if (genreIds && genreIds.length > 0) {
      const genreParam = genreIds.join(',');
      let url = `https://api.themoviedb.org/3/discover/movie?api_key=${encodeURIComponent(apiKey)}&language=pt-BR&sort_by=vote_average.desc&vote_count.gte=200&with_genres=${genreParam}&page=1`;

      // Exclude disliked genres
      if (excludeGenreIds && excludeGenreIds.length > 0) {
        url += `&without_genres=${excludeGenreIds.join(',')}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      const results = (data.results || [])
        .filter(m => dedup(m))
        .slice(0, 20)
        .map(mapMovie);

      return res.status(200).json({ results, type: 'personalized' });
    }

    // Strategy 3: Trending movies of the week
    const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${encodeURIComponent(apiKey)}&language=pt-BR`;
    const response = await fetch(url);
    const data = await response.json();

    const results = (data.results || [])
      .filter(m => dedup(m))
      .slice(0, 20)
      .map(mapMovie);

    return res.status(200).json({ results, type: 'trending' });
  } catch (err) {
    console.error('Erro em /api/recommendations:', err);
    return res.status(500).json({ error: 'Erro ao buscar recomendações: ' + err.message });
  }
};
