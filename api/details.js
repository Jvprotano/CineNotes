module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { tmdbId } = req.body || {};
    if (!tmdbId) return res.status(400).json({ error: 'tmdbId é obrigatório' });

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TMDB_API_KEY não configurada no servidor.' });
    }

    const [detailsRes, creditsRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${encodeURIComponent(tmdbId)}?api_key=${apiKey}&language=pt-BR`),
      fetch(`https://api.themoviedb.org/3/movie/${encodeURIComponent(tmdbId)}/credits?api_key=${apiKey}&language=pt-BR`),
    ]);

    const details = await detailsRes.json();
    const credits = await creditsRes.json();

    if (details.success === false) {
      return res.status(404).json({ error: 'Filme não encontrado no TMDB.' });
    }

    const director = (credits.crew || []).find(c => c.job === 'Director');
    const cast = (credits.cast || []).slice(0, 8).map(c => ({
      name: c.name,
      character: c.character,
      photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : '',
    }));

    return res.status(200).json({
      tmdbId: details.id,
      title: details.title,
      originalTitle: details.original_title,
      year: details.release_date ? details.release_date.slice(0, 4) : '',
      overview: details.overview || '',
      poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '',
      backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : '',
      runtime: details.runtime || null,
      genres: (details.genres || []).map(g => g.name).join(', '),
      voteAverage: details.vote_average || null,
      director: director ? director.name : '',
      cast,
    });
  } catch (err) {
    console.error('Erro em /api/details:', err);
    return res.status(500).json({ error: 'Erro ao buscar detalhes: ' + err.message });
  }
};
