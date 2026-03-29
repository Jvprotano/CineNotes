// ========== State ==========
let movies = [];
let tmdbKey = '';
let currentTab = 'ranking';
let session = JSON.parse(sessionStorage.getItem('cinenotes_session') || 'null');

// ========== DOM ==========
const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const grid = document.getElementById('movie-grid');
const emptyState = document.getElementById('empty-state');
const statsBar = document.getElementById('stats-bar');
const savingIndicator = document.getElementById('saving-indicator');

// ========== API Helpers ==========
async function api(endpoint, body) {
  const res = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Erro no servidor. Verifique se o Blob Store está conectado ao projeto na Vercel.');
  }
  if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
  return data;
}

async function saveToServer() {
  if (!session) return;
  savingIndicator.style.display = 'block';
  try {
    await api('save', {
      code: session.code,
      password: session.password,
      movies,
      tmdbKey,
    });
  } catch (err) {
    console.error('Erro ao salvar:', err);
    alert('Erro ao salvar: ' + err.message);
  } finally {
    setTimeout(() => { savingIndicator.style.display = 'none'; }, 800);
  }
}

// ========== Utility ==========
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getEffectiveRating(movie) {
  if (movie.ratingJoint !== null && movie.ratingJoint !== undefined) {
    return movie.ratingJoint;
  }
  const ratings = [];
  if (movie.ratingHim !== null && movie.ratingHim !== undefined) ratings.push(movie.ratingHim);
  if (movie.ratingHer !== null && movie.ratingHer !== undefined) ratings.push(movie.ratingHer);
  if (ratings.length === 0) return 0;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

function getHisRating(movie) {
  if (movie.ratingHim !== null && movie.ratingHim !== undefined) return movie.ratingHim;
  if (movie.ratingJoint !== null && movie.ratingJoint !== undefined) return movie.ratingJoint;
  return null;
}

function getHerRating(movie) {
  if (movie.ratingHer !== null && movie.ratingHer !== undefined) return movie.ratingHer;
  if (movie.ratingJoint !== null && movie.ratingJoint !== undefined) return movie.ratingJoint;
  return null;
}

function getRatingClass(rating) {
  if (rating >= 7) return 'high';
  if (rating >= 4) return 'mid';
  return 'low';
}

function formatRating(val) {
  return val !== null && val !== undefined ? val.toFixed(1) : '—';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ========== Login / Auth ==========
document.querySelectorAll('.login-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isCreate = tab.dataset.ltab === 'create';
    document.getElementById('form-enter').style.display = isCreate ? 'none' : 'flex';
    document.getElementById('form-create').style.display = isCreate ? 'flex' : 'none';
    hideMessages();
  });
});

function hideMessages() {
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('login-success').style.display = 'none';
}

function showError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.style.display = 'block';
  document.getElementById('login-success').style.display = 'none';
}

function showSuccess(msg) {
  const el = document.getElementById('login-success');
  el.textContent = msg;
  el.style.display = 'block';
  document.getElementById('login-error').style.display = 'none';
}

// Enter room
document.getElementById('form-enter').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessages();
  const code = document.getElementById('enter-code').value.trim();
  const password = document.getElementById('enter-pass').value;

  try {
    const data = await api('load', { code, password });
    session = { code, password };
    sessionStorage.setItem('cinenotes_session', JSON.stringify(session));
    movies = data.movies || [];
    tmdbKey = data.tmdbKey || '';
    enterApp();
  } catch (err) {
    showError(err.message);
  }
});

// Create room
document.getElementById('form-create').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessages();
  const code = document.getElementById('create-code').value.trim().replace(/\s+/g, '-');
  const password = document.getElementById('create-pass').value;

  try {
    await api('create', { code, password });
    showSuccess('Sala criada! Entrando...');
    session = { code, password };
    sessionStorage.setItem('cinenotes_session', JSON.stringify(session));
    movies = [];
    tmdbKey = '';
    setTimeout(enterApp, 800);
  } catch (err) {
    showError(err.message);
  }
});

function enterApp() {
  loginScreen.style.display = 'none';
  app.style.display = 'block';
  document.getElementById('room-name').textContent = session.code;
  updateSearchVisibility();
  render();
}

// Auto-login if session exists
async function tryAutoLogin() {
  if (!session) return;
  try {
    const data = await api('load', { code: session.code, password: session.password });
    movies = data.movies || [];
    tmdbKey = data.tmdbKey || '';
    enterApp();
  } catch {
    session = null;
    sessionStorage.removeItem('cinenotes_session');
  }
}

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
  session = null;
  sessionStorage.removeItem('cinenotes_session');
  app.style.display = 'none';
  loginScreen.style.display = 'flex';
  document.getElementById('form-enter').reset();
  document.getElementById('form-create').reset();
  hideMessages();
});

// ========== Render ==========
function render() {
  let sorted = [...movies];
  let showRank = true;
  let ratingFn = getEffectiveRating;

  switch (currentTab) {
    case 'ranking':
      sorted.sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a));
      ratingFn = getEffectiveRating;
      break;
    case 'ele':
      sorted = sorted.filter(m => getHisRating(m) !== null);
      sorted.sort((a, b) => getHisRating(b) - getHisRating(a));
      ratingFn = getHisRating;
      break;
    case 'ela':
      sorted = sorted.filter(m => getHerRating(m) !== null);
      sorted.sort((a, b) => getHerRating(b) - getHerRating(a));
      ratingFn = getHerRating;
      break;
    case 'todos':
      sorted.sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
      showRank = false;
      ratingFn = getEffectiveRating;
      break;
  }

  if (sorted.length === 0 && movies.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'block';
  } else {
    grid.style.display = 'grid';
    emptyState.style.display = sorted.length === 0 ? 'none' : 'grid';
    if (sorted.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = 'block';
    }
  }

  renderStats();

  grid.innerHTML = sorted.map((movie, i) => {
    const rating = ratingFn(movie);
    const ratingClass = getRatingClass(rating);
    const rank = i + 1;

    let rankBadge = '';
    if (showRank) {
      const rankClass = rank <= 3 ? ` rank-${rank}` : '';
      rankBadge = `<div class="rank-badge${rankClass}">${rank}</div>`;
    }

    const posterHtml = movie.poster
      ? `<img src="${escapeHtml(movie.poster)}" alt="${escapeHtml(movie.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=no-poster>🎬</div>'">`
      : `<div class="no-poster">🎬</div>`;

    let detailParts = [];
    if (movie.ratingJoint !== null && movie.ratingJoint !== undefined) {
      detailParts.push(`Conjunta: ${formatRating(movie.ratingJoint)}`);
    }
    if (movie.ratingHim !== null && movie.ratingHim !== undefined) {
      detailParts.push(`👨 ${formatRating(movie.ratingHim)}`);
    }
    if (movie.ratingHer !== null && movie.ratingHer !== undefined) {
      detailParts.push(`👩 ${formatRating(movie.ratingHer)}`);
    }

    return `
      <div class="movie-card" onclick="openEditModal('${movie.id}')">
        ${rankBadge}
        <div class="poster-container">${posterHtml}</div>
        <div class="card-info">
          <div class="card-title" title="${escapeHtml(movie.title)}">${escapeHtml(movie.title)}</div>
          ${movie.year ? `<div class="card-year">${movie.year}</div>` : ''}
          ${movie.genre ? `<div class="card-genre">${escapeHtml(movie.genre)}</div>` : ''}
          <div class="card-rating">
            <span class="rating-badge ${ratingClass}">${rating !== null ? rating.toFixed(1) : '—'}</span>
            <span class="card-rating-details">${detailParts.join(' · ')}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderStats() {
  if (movies.length === 0) { statsBar.innerHTML = ''; return; }
  const total = movies.length;
  const avgAll = movies.reduce((s, m) => s + getEffectiveRating(m), 0) / total;
  const best = [...movies].sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a))[0];

  statsBar.innerHTML = `
    <span class="stat-item">🎬 <strong>${total}</strong> filme${total > 1 ? 's' : ''}</span>
    <span class="stat-item">⭐ Média geral: <strong>${avgAll.toFixed(1)}</strong></span>
    <span class="stat-item">🏆 Melhor: <strong>${escapeHtml(best.title)}</strong> (${getEffectiveRating(best).toFixed(1)})</span>
  `;
}

// ========== Tabs ==========
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    render();
  });
});

// ========== Add Modal ==========
document.getElementById('btn-add').addEventListener('click', openAddModal);

function openAddModal() {
  document.getElementById('form-movie').reset();
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('search-input').value = '';
  document.getElementById('poster-preview').style.display = 'none';
  document.getElementById('joint-rating').style.display = 'block';
  document.getElementById('individual-rating').style.display = 'none';
  document.getElementById('rating-joint').checked = true;
  updateSliderDisplay('rate-joint', 'rate-joint-val');
  updateSliderDisplay('rate-him', 'rate-him-val');
  updateSliderDisplay('rate-her', 'rate-her-val');
  updateSearchVisibility();
  document.getElementById('modal-add').style.display = 'flex';
}

function updateSearchVisibility() {
  const hasKey = !!tmdbKey;
  document.getElementById('search-section').style.display = hasKey ? 'block' : 'none';
  document.getElementById('search-divider').style.display = hasKey ? 'block' : 'none';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
});

// Rating type toggle (add)
document.querySelectorAll('input[name="rating-type"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isJoint = document.getElementById('rating-joint').checked;
    document.getElementById('joint-rating').style.display = isJoint ? 'block' : 'none';
    document.getElementById('individual-rating').style.display = isJoint ? 'none' : 'block';
  });
});

// Rating type toggle (edit)
document.querySelectorAll('input[name="edit-rating-type"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isJoint = document.getElementById('edit-rating-joint').checked;
    document.getElementById('edit-joint-rating').style.display = isJoint ? 'block' : 'none';
    document.getElementById('edit-individual-rating').style.display = isJoint ? 'none' : 'block';
  });
});

// Slider displays
function updateSliderDisplay(sliderId, displayId) {
  const slider = document.getElementById(sliderId);
  const display = document.getElementById(displayId);
  display.textContent = parseFloat(slider.value).toFixed(1);
}

['rate-joint', 'rate-him', 'rate-her', 'edit-rate-joint', 'edit-rate-him', 'edit-rate-her'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => updateSliderDisplay(id, id + '-val'));
});

// Poster preview
document.getElementById('movie-poster').addEventListener('input', (e) => {
  const url = e.target.value.trim();
  const preview = document.getElementById('poster-preview');
  const img = document.getElementById('poster-preview-img');
  if (url) {
    img.src = url;
    preview.style.display = 'flex';
    img.onerror = () => { preview.style.display = 'none'; };
  } else {
    preview.style.display = 'none';
  }
});

// ========== Form Submit (Add) ==========
document.getElementById('form-movie').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('movie-title').value.trim();
  if (!title) return;

  const isJoint = document.getElementById('rating-joint').checked;
  const movie = {
    id: generateId(),
    title,
    year: document.getElementById('movie-year').value ? parseInt(document.getElementById('movie-year').value) : null,
    poster: document.getElementById('movie-poster').value.trim() || null,
    genre: document.getElementById('movie-genre').value.trim() || null,
    ratingJoint: isJoint ? parseFloat(document.getElementById('rate-joint').value) : null,
    ratingHim: !isJoint ? parseFloat(document.getElementById('rate-him').value) : null,
    ratingHer: !isJoint ? parseFloat(document.getElementById('rate-her').value) : null,
    dateAdded: new Date().toISOString().slice(0, 10),
  };

  movies.push(movie);
  closeModal('modal-add');
  render();
  await saveToServer();
});

// ========== Edit Modal ==========
function openEditModal(id) {
  const movie = movies.find(m => m.id === id);
  if (!movie) return;

  document.getElementById('edit-id').value = movie.id;
  document.getElementById('edit-title').value = movie.title;
  document.getElementById('edit-year').value = movie.year || '';
  document.getElementById('edit-poster').value = movie.poster || '';
  document.getElementById('edit-genre').value = movie.genre || '';

  const hasJoint = movie.ratingJoint !== null && movie.ratingJoint !== undefined;
  if (hasJoint) {
    document.getElementById('edit-rating-joint').checked = true;
    document.getElementById('edit-joint-rating').style.display = 'block';
    document.getElementById('edit-individual-rating').style.display = 'none';
    document.getElementById('edit-rate-joint').value = movie.ratingJoint;
  } else {
    document.getElementById('edit-rating-individual').checked = true;
    document.getElementById('edit-joint-rating').style.display = 'none';
    document.getElementById('edit-individual-rating').style.display = 'block';
    document.getElementById('edit-rate-him').value = movie.ratingHim ?? 5;
    document.getElementById('edit-rate-her').value = movie.ratingHer ?? 5;
  }

  updateSliderDisplay('edit-rate-joint', 'edit-rate-joint-val');
  updateSliderDisplay('edit-rate-him', 'edit-rate-him-val');
  updateSliderDisplay('edit-rate-her', 'edit-rate-her-val');

  document.getElementById('modal-edit').style.display = 'flex';
}

// Form Submit (Edit)
document.getElementById('form-edit').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const idx = movies.findIndex(m => m.id === id);
  if (idx === -1) return;

  const isJoint = document.getElementById('edit-rating-joint').checked;
  movies[idx] = {
    ...movies[idx],
    title: document.getElementById('edit-title').value.trim(),
    year: document.getElementById('edit-year').value ? parseInt(document.getElementById('edit-year').value) : null,
    poster: document.getElementById('edit-poster').value.trim() || null,
    genre: document.getElementById('edit-genre').value.trim() || null,
    ratingJoint: isJoint ? parseFloat(document.getElementById('edit-rate-joint').value) : null,
    ratingHim: !isJoint ? parseFloat(document.getElementById('edit-rate-him').value) : null,
    ratingHer: !isJoint ? parseFloat(document.getElementById('edit-rate-her').value) : null,
  };

  closeModal('modal-edit');
  render();
  await saveToServer();
});

// Delete
document.getElementById('btn-delete').addEventListener('click', async () => {
  const id = document.getElementById('edit-id').value;
  if (!confirm('Tem certeza que deseja excluir este filme?')) return;
  movies = movies.filter(m => m.id !== id);
  closeModal('modal-edit');
  render();
  await saveToServer();
});

// ========== TMDB Search ==========
document.getElementById('btn-search').addEventListener('click', searchTMDB);
document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); searchTMDB(); }
});

async function searchTMDB() {
  const query = document.getElementById('search-input').value.trim();
  if (!query || !tmdbKey) return;

  const resultsDiv = document.getElementById('search-results');
  resultsDiv.innerHTML = '<p style="padding:10px;color:var(--text-muted)">Buscando...</p>';

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(tmdbKey)}&language=pt-BR&query=${encodeURIComponent(query)}&page=1`
    );
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      resultsDiv.innerHTML = '<p style="padding:10px;color:var(--text-muted)">Nenhum resultado encontrado.</p>';
      return;
    }

    resultsDiv.innerHTML = data.results.slice(0, 8).map(m => {
      const posterUrl = m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : '';
      const year = m.release_date ? m.release_date.slice(0, 4) : '';
      return `
        <div class="search-result-item" onclick='selectTMDBResult(${JSON.stringify({
          title: m.title,
          year: year,
          poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
        }).replace(/'/g, "&#39;")})'>
          ${posterUrl ? `<img src="${posterUrl}" alt="">` : '<div style="width:40px;height:60px;background:#222;border-radius:4px;display:flex;align-items:center;justify-content:center;">🎬</div>'}
          <div class="search-result-info">
            <div class="title">${escapeHtml(m.title)}</div>
            <div class="year">${year}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    resultsDiv.innerHTML = `<p style="padding:10px;color:var(--accent)">Erro: ${escapeHtml(err.message)}</p>`;
  }
}

function selectTMDBResult(data) {
  document.getElementById('movie-title').value = data.title || '';
  document.getElementById('movie-year').value = data.year || '';
  document.getElementById('movie-poster').value = data.poster || '';

  if (data.poster) {
    const preview = document.getElementById('poster-preview');
    const img = document.getElementById('poster-preview-img');
    img.src = data.poster;
    preview.style.display = 'flex';
  }

  document.getElementById('search-results').innerHTML =
    '<p style="padding:10px;color:var(--green)">✓ Filme selecionado! Ajuste as informações se necessário.</p>';
}

// ========== Config ==========
document.getElementById('btn-config').addEventListener('click', () => {
  document.getElementById('tmdb-key').value = tmdbKey;
  document.getElementById('modal-config').style.display = 'flex';
});

document.getElementById('btn-save-config').addEventListener('click', async () => {
  tmdbKey = document.getElementById('tmdb-key').value.trim();
  closeModal('modal-config');
  updateSearchVisibility();
  await saveToServer();
});

// ========== Keyboard ==========
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
  }
});

// ========== Init ==========
tryAutoLogin();
