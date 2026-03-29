const { put, list } = require('@vercel/blob');
const crypto = require('crypto');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { code, password } = req.body || {};

    if (!code || !password) {
      return res.status(400).json({ error: 'Código e senha são obrigatórios' });
    }

    const cleanCode = code.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '');

    if (cleanCode.length < 3 || cleanCode.length > 30) {
      return res.status(400).json({ error: 'Código deve ter entre 3 e 30 caracteres (letras, números, - e _)' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' });
    }

    const path = `salas/${cleanCode}.json`;
    const { blobs } = await list({ prefix: path });

    if (blobs.length > 0) {
      return res.status(409).json({ error: 'Este código já está em uso. Escolha outro.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.createHash('sha256').update(salt + password).digest('hex');

    const data = {
      salt,
      passwordHash,
      movies: [],
      tmdbKey: '',
      createdAt: new Date().toISOString(),
    };

    await put(path, JSON.stringify(data), {
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Erro em /api/create:', err);
    return res.status(500).json({ error: 'Erro interno do servidor: ' + err.message });
  }
};
