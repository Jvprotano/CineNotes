const GENRE_MAP = {
  28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia',
  80: 'Crime', 99: 'Documentário', 18: 'Drama', 10751: 'Família',
  14: 'Fantasia', 36: 'História', 27: 'Terror', 10402: 'Música',
  9648: 'Mistério', 10749: 'Romance', 878: 'Ficção Científica',
  10770: 'Telefilme', 53: 'Suspense', 10752: 'Guerra', 37: 'Faroeste',
};

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { query } = req.body || {};
    if (!query) return res.status(400).json({ error: 'Query é obrigatória' });

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TMDB_API_KEY não configurada no servidor.' });
    }

    const url = `https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(apiKey)}&language=pt-BR&query=${encodeURIComponent(query)}&page=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results) {
      return res.status(200).json({ results: [] });
    }

    const results = data.results.slice(0, 12).map(m => ({
      tmdbId: m.id,
      title: m.title,
      year: m.release_date ? m.release_date.slice(0, 4) : '',
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
      posterThumb: m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : '',
      genre: (m.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean).join(', '),
      overview: m.overview || '',
    }));

    return res.status(200).json({ results });
  } catch (err) {
    console.error('Erro em /api/search:', err);
    return res.status(500).json({ error: 'Erro ao buscar filmes: ' + err.message });
  }
};
