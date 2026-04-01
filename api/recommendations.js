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

    const { genreIds, excludeTmdbIds } = req.body || {};
    const exclude = new Set(excludeTmdbIds || []);

    // If user provided preferred genres, use discover endpoint filtered by those genres
    if (genreIds && genreIds.length > 0) {
      const genreParam = genreIds.join(',');
      const url = `https://api.themoviedb.org/3/discover/movie?api_key=${encodeURIComponent(apiKey)}&language=pt-BR&sort_by=vote_average.desc&vote_count.gte=200&with_genres=${genreParam}&page=1`;
      const response = await fetch(url);
      const data = await response.json();

      const results = (data.results || [])
        .filter(m => !exclude.has(m.id))
        .slice(0, 20)
        .map(mapMovie);

      return res.status(200).json({ results, type: 'personalized' });
    }

    // Fallback: trending movies of the week
    const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${encodeURIComponent(apiKey)}&language=pt-BR`;
    const response = await fetch(url);
    const data = await response.json();

    const results = (data.results || [])
      .filter(m => !exclude.has(m.id))
      .slice(0, 20)
      .map(mapMovie);

    return res.status(200).json({ results, type: 'trending' });
  } catch (err) {
    console.error('Erro em /api/recommendations:', err);
    return res.status(500).json({ error: 'Erro ao buscar recomendações: ' + err.message });
  }
};
