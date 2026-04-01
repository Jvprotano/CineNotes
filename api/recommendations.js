const GENRE_MAP = {
  28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia',
  80: 'Crime', 99: 'Documentário', 18: 'Drama', 10751: 'Família',
  14: 'Fantasia', 36: 'História', 27: 'Terror', 10402: 'Música',
  9648: 'Mistério', 10749: 'Romance', 878: 'Ficção Científica',
  10770: 'Telefilme', 53: 'Suspense', 10752: 'Guerra', 37: 'Faroeste',
};

function mapMovie(m, score) {
  return {
    tmdbId: m.id,
    title: m.title,
    year: m.release_date ? m.release_date.slice(0, 4) : '',
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
    posterThumb: m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : '',
    genre: (m.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean).join(', '),
    overview: m.overview || '',
    voteAverage: m.vote_average || 0,
    score: score !== undefined ? Math.round(score * 10) / 10 : undefined,
  };
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TMDB_API_KEY não configurada no servidor.' });
    }

    const { seeds, dislikedGenreIds, excludeTmdbIds } = req.body || {};
    const exclude = new Set(excludeTmdbIds || []);
    const dislikedSet = new Set(dislikedGenreIds || []);

    // ─── Strategy 1: Voting by frequency, weighted by seed rating ───
    // For each seed movie (rated >= 8.5), fetch TMDB recommendations.
    // Each recommended movie accumulates score = sum of seed ratings.
    // Movies recommended by more (and higher-rated) seeds rank higher.
    // TMDB vote_average is used as tiebreaker.
    // Disliked genres apply a penalty (not a hard filter).
    if (seeds && seeds.length > 0) {
      // Fetch recommendations for ALL seed movies in parallel
      const fetches = seeds.map(async ({ tmdbId, rating }) => {
        const url = `https://api.themoviedb.org/3/movie/${encodeURIComponent(tmdbId)}/recommendations?api_key=${encodeURIComponent(apiKey)}&language=pt-BR&page=1`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          return { results: data.results || [], rating };
        } catch {
          return { results: [], rating };
        }
      });

      const resultSets = await Promise.all(fetches);

      // Accumulate scores: movieId -> { movie, score, votes }
      const scoreMap = new Map();

      for (const { results, rating } of resultSets) {
        for (const m of results) {
          if (exclude.has(m.id)) continue;

          if (scoreMap.has(m.id)) {
            const entry = scoreMap.get(m.id);
            entry.score += rating;
            entry.votes += 1;
          } else {
            scoreMap.set(m.id, { movie: m, score: rating, votes: 1 });
          }
        }
      }

      if (scoreMap.size > 0) {
        // Apply disliked genre penalty: reduce score by 30% per disliked genre
        for (const entry of scoreMap.values()) {
          const genres = entry.movie.genre_ids || [];
          const dislikedCount = genres.filter(g => dislikedSet.has(g)).length;
          if (dislikedCount > 0) {
            entry.score *= Math.pow(0.7, dislikedCount);
          }
        }

        // Sort by: score desc, then TMDB vote_average as tiebreaker
        const sorted = [...scoreMap.values()]
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (b.movie.vote_average || 0) - (a.movie.vote_average || 0);
          });

        const results = sorted.slice(0, 20).map(e => mapMovie(e.movie, e.score));
        return res.status(200).json({ results, type: 'personalized' });
      }
    }

    // ─── Strategy 2: Trending (fallback when no seeds) ───
    const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${encodeURIComponent(apiKey)}&language=pt-BR`;
    const response = await fetch(url);
    const data = await response.json();

    const results = (data.results || [])
      .filter(m => !exclude.has(m.id))
      .slice(0, 20)
      .map(m => mapMovie(m));

    return res.status(200).json({ results, type: 'trending' });
  } catch (err) {
    console.error('Erro em /api/recommendations:', err);
    return res.status(500).json({ error: 'Erro ao buscar recomendações: ' + err.message });
  }
};
