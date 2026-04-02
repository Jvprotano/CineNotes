const { put, list } = require('@vercel/blob');
const crypto = require('crypto');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { code, password, movies, watchlist, dismissed, tmdbKey } = req.body || {};

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

    data.movies = movies || data.movies;
    data.watchlist = watchlist !== undefined ? watchlist : (data.watchlist || []);
    data.dismissed = dismissed !== undefined ? dismissed : (data.dismissed || []);
    if (tmdbKey !== undefined) data.tmdbKey = tmdbKey;
    data.updatedAt = new Date().toISOString();

    await put(path, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro em /api/save:', err);
    return res.status(500).json({ error: 'Erro interno do servidor: ' + err.message });
  }
};
