const { list } = require('@vercel/blob');
const crypto = require('crypto');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { code, password } = req.body || {};

    if (!code || !password) {
      return res.status(400).json({ error: 'Código e senha são obrigatórios' });
    }

    const cleanCode = code.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '');
    const path = `salas/${cleanCode}.json`;
    const { blobs } = await list({ prefix: path });

    if (blobs.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    const response = await fetch(blobs[0].url);
    const data = await response.json();

    const hash = crypto.createHash('sha256').update(data.salt + password).digest('hex');

    if (hash !== data.passwordHash) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    return res.status(200).json({
      movies: data.movies || [],
      watchlist: data.watchlist || [],
      tmdbKey: data.tmdbKey || '',
    });
  } catch (err) {
    console.error('Erro em /api/load:', err);
    return res.status(500).json({ error: 'Erro interno do servidor: ' + err.message });
  }
};
