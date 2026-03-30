// ========== State ==========
let movies = [];
let watchlist = [];
let currentTab = 'ranking';
let selectedMovies = [];
let searchResults = [];
let addTarget = 'movies'; // 'movies' or 'watchlist'
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
      watchlist,
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
  if (ratings.length === 0) return null;
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
  if (rating === null || rating === undefined) return 'none';
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

// ========== Slider ==========
function scrollSlider(trackId, direction) {
  const track = document.getElementById(trackId);
  if (!track) return;
  const scrollAmount = track.clientWidth * 0.75;
  track.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

function updateSliderArrows(trackId) {
  const track = document.getElementById(trackId);
  if (!track) return;
  const container = track.closest('.slider-container');
  if (!container) return;
  const leftArrow = container.querySelector('.slider-arrow-left');
  const rightArrow = container.querySelector('.slider-arrow-right');

  if (leftArrow) {
    leftArrow.style.display = track.scrollLeft > 10 ? 'flex' : 'none';
  }
  if (rightArrow) {
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10;
    rightArrow.style.display = atEnd ? 'none' : 'flex';
  }
}

function initSlider(trackId) {
  const track = document.getElementById(trackId);
  if (!track) return;
  track.addEventListener('scroll', () => updateSliderArrows(trackId));
}

window.addEventListener('resize', () => {
  updateSliderArrows('watchlist-track');
  updateSliderArrows('movie-grid');
});

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
    watchlist = data.watchlist || [];
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
    watchlist = [];
    setTimeout(enterApp, 800);
  } catch (err) {
    showError(err.message);
  }
});

function enterApp() {
  loginScreen.style.display = 'none';
  app.style.display = 'block';
  document.getElementById('room-name').textContent = session.code;
  initSlider('watchlist-track');
  initSlider('movie-grid');
  render();
}

// Auto-login if session exists
async function tryAutoLogin() {
  if (!session) return;
  try {
    const data = await api('load', { code: session.code, password: session.password });
    movies = data.movies || [];
    watchlist = data.watchlist || [];
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
  renderWatchlist();

  let sorted = [...movies];
  let showRank = true;
  let ratingFn = getEffectiveRating;

  switch (currentTab) {
    case 'ranking':
      sorted.sort((a, b) => (getEffectiveRating(b) ?? -1) - (getEffectiveRating(a) ?? -1));
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

  const rankingSlider = document.getElementById('ranking-slider');

  if (movies.length === 0) {
    rankingSlider.style.display = 'none';
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    rankingSlider.style.display = sorted.length > 0 ? 'block' : 'none';
  }

  renderStats();

  grid.innerHTML = sorted.map((movie, i) => {
    const rating = ratingFn(movie);
    const ratingClass = getRatingClass(rating);
    const rank = i + 1;

    let rankBadge = '';
    if (showRank && rating !== null) {
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

    const ratingDisplay = rating !== null && rating !== undefined ? rating.toFixed(1) : 'Sem nota';

    const infoBtn = `<button class="btn-info" onclick="event.stopPropagation(); openDetailModal('${movie.id}')" title="Detalhes do filme">ℹ️</button>`;

    return `
      <div class="movie-card" onclick="openEditModal('${movie.id}')">
        ${rankBadge}
        ${infoBtn}
        <div class="poster-container">${posterHtml}</div>
        <div class="card-info">
          <div class="card-title" title="${escapeHtml(movie.title)}">${escapeHtml(movie.title)}</div>
          ${movie.year ? `<div class="card-year">${movie.year}</div>` : ''}
          ${movie.genre ? `<div class="card-genre">${escapeHtml(movie.genre)}</div>` : ''}
          <div class="card-rating">
            <span class="rating-badge ${ratingClass}">${ratingDisplay}</span>
            ${detailParts.length > 0 ? `<span class="card-rating-details">${detailParts.join(' · ')}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  setTimeout(() => updateSliderArrows('movie-grid'), 100);
}

// ========== Render Watchlist ==========
function renderWatchlist() {
  const section = document.getElementById('watchlist-section');
  const track = document.getElementById('watchlist-track');
  const countEl = document.getElementById('watchlist-count');

  if (watchlist.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  countEl.textContent = `${watchlist.length} filme${watchlist.length > 1 ? 's' : ''}`;

  track.innerHTML = watchlist.map(item => {
    const posterHtml = item.poster
      ? `<img src="${escapeHtml(item.poster)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=no-poster>🎬</div>'">`
      : `<div class="no-poster">🎬</div>`;

    return `
      <div class="watchlist-card">
        <div class="poster-container">${posterHtml}</div>
        <div class="card-info">
          <div class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
          ${item.year ? `<div class="card-year">${item.year}</div>` : ''}
          ${item.genre ? `<div class="card-genre">${escapeHtml(item.genre)}</div>` : ''}
          <div class="watchlist-actions">
            <button class="btn-watched" onclick="openMarkWatchedModal('${item.id}')" title="Marcar como assistido">✓ Assistido</button>
            <button class="btn-remove-wl" onclick="removeFromWatchlist('${item.id}')" title="Remover">✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  setTimeout(() => updateSliderArrows('watchlist-track'), 100);
}

function renderStats() {
  if (movies.length === 0) { statsBar.innerHTML = ''; return; }
  const total = movies.length;
  const rated = movies.filter(m => getEffectiveRating(m) !== null);
  const avgAll = rated.length > 0 ? rated.reduce((s, m) => s + getEffectiveRating(m), 0) / rated.length : 0;
  const best = rated.length > 0
    ? [...rated].sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a))[0]
    : null;

  statsBar.innerHTML = `
    <span class="stat-item">🎬 <strong>${total}</strong> filme${total > 1 ? 's' : ''}</span>
    ${rated.length > 0 ? `<span class="stat-item">⭐ Média geral: <strong>${avgAll.toFixed(1)}</strong></span>` : ''}
    ${best ? `<span class="stat-item">🏆 Melhor: <strong>${escapeHtml(best.title)}</strong> (${getEffectiveRating(best).toFixed(1)})</span>` : ''}
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

// ========== Add Modal (Multi-Select) ==========
document.getElementById('btn-add').addEventListener('click', () => openAddModal('movies'));

function openAddModal(target) {
  addTarget = target || 'movies';
  selectedMovies = [];
  searchResults = [];
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('manual-title').value = '';
  document.getElementById('manual-year').value = '';
  renderSelectedMovies();

  // Update modal title based on target
  const modalTitle = document.querySelector('#modal-add .modal-header h2');
  if (addTarget === 'watchlist') {
    modalTitle.textContent = 'Adicionar à Minha Lista';
  } else {
    modalTitle.textContent = 'Adicionar Filmes';
  }

  document.getElementById('modal-add').style.display = 'flex';
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

// ========== TMDB Search ==========
document.getElementById('btn-search').addEventListener('click', searchTMDB);
document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); searchTMDB(); }
});

async function searchTMDB() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  const resultsDiv = document.getElementById('search-results');
  resultsDiv.innerHTML = '<p style="padding:10px;color:var(--text-muted)">Buscando...</p>';

  try {
    const data = await api('search', { query });
    searchResults = data.results || [];

    if (searchResults.length === 0) {
      resultsDiv.innerHTML = '<p style="padding:10px;color:var(--text-muted)">Nenhum resultado encontrado.</p>';
      return;
    }

    renderSearchResults();
  } catch (err) {
    resultsDiv.innerHTML = `<p style="padding:10px;color:var(--accent)">Erro: ${escapeHtml(err.message)}</p>`;
  }
}

function renderSearchResults() {
  const resultsDiv = document.getElementById('search-results');
  resultsDiv.innerHTML = searchResults.map((m, i) => {
    const alreadySelected = isAlreadySelected(m);
    const posterHtml = m.posterThumb
      ? `<img src="${escapeHtml(m.posterThumb)}" alt="">`
      : '<div style="width:40px;height:60px;background:#222;border-radius:4px;display:flex;align-items:center;justify-content:center;">🎬</div>';

    return `
      <div class="search-result-item ${alreadySelected ? 'selected' : ''}">
        ${posterHtml}
        <div class="search-result-info">
          <div class="title">${escapeHtml(m.title)}</div>
          <div class="year">${m.year}${m.genre ? ' · ' + escapeHtml(m.genre) : ''}</div>
        </div>
        <button class="btn-add-result ${alreadySelected ? 'added' : ''}" onclick="addToSelected(${i})" ${alreadySelected ? 'disabled' : ''}>
          ${alreadySelected ? '✓' : '+'}
        </button>
      </div>
    `;
  }).join('');
}

function isAlreadySelected(m) {
  if (selectedMovies.some(s => s.tmdbId && s.tmdbId === m.tmdbId)) return true;
  if (m.tmdbId && movies.some(mv => mv.tmdbId === m.tmdbId)) return true;
  if (m.tmdbId && watchlist.some(wl => wl.tmdbId === m.tmdbId)) return true;
  return false;
}

function addToSelected(index) {
  const m = searchResults[index];
  if (!m || isAlreadySelected(m)) return;

  selectedMovies.push({
    tmdbId: m.tmdbId || null,
    title: m.title,
    year: m.year || '',
    poster: m.poster || '',
    posterThumb: m.posterThumb || '',
    genre: m.genre || '',
    overview: m.overview || '',
  });

  renderSearchResults();
  renderSelectedMovies();
}

function removeFromSelected(index) {
  selectedMovies.splice(index, 1);
  renderSearchResults();
  renderSelectedMovies();
}

function renderSelectedMovies() {
  const section = document.getElementById('selected-section');
  const list = document.getElementById('selected-list');
  const count = document.getElementById('selected-count');
  const btn = document.getElementById('btn-submit-selected');

  if (selectedMovies.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  count.textContent = selectedMovies.length;

  if (addTarget === 'watchlist') {
    btn.textContent = `Adicionar ${selectedMovies.length} à Minha Lista`;
  } else {
    btn.textContent = `Adicionar ${selectedMovies.length} Filme${selectedMovies.length > 1 ? 's' : ''}`;
  }

  list.innerHTML = selectedMovies.map((m, i) => {
    const thumb = m.posterThumb || m.poster;
    return `
      <div class="selected-item">
        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="">` : '<div class="selected-item-placeholder">🎬</div>'}
        <div class="selected-item-info">
          <span class="title">${escapeHtml(m.title)}</span>
          <span class="meta">${m.year || ''}${m.genre ? ' · ' + escapeHtml(m.genre) : ''}</span>
        </div>
        <button class="btn-remove-selected" onclick="removeFromSelected(${i})" title="Remover">✕</button>
      </div>
    `;
  }).join('');
}

function addManualToSelected() {
  const titleInput = document.getElementById('manual-title');
  const yearInput = document.getElementById('manual-year');
  const title = titleInput.value.trim();
  if (!title) return;

  selectedMovies.push({
    tmdbId: null,
    title,
    year: yearInput.value || '',
    poster: '',
    posterThumb: '',
    genre: '',
    overview: '',
  });

  titleInput.value = '';
  yearInput.value = '';
  renderSelectedMovies();
}

// Manual add on Enter
document.getElementById('manual-title').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addManualToSelected(); }
});

async function submitSelectedMovies() {
  if (selectedMovies.length === 0) return;

  if (addTarget === 'watchlist') {
    for (const sm of selectedMovies) {
      watchlist.push({
        id: generateId(),
        tmdbId: sm.tmdbId || null,
        title: sm.title,
        year: sm.year ? parseInt(sm.year) : null,
        poster: sm.poster || null,
        genre: sm.genre || null,
        overview: sm.overview || null,
        dateAdded: new Date().toISOString().slice(0, 10),
      });
    }
  } else {
    for (const sm of selectedMovies) {
      movies.push({
        id: generateId(),
        tmdbId: sm.tmdbId || null,
        title: sm.title,
        year: sm.year ? parseInt(sm.year) : null,
        poster: sm.poster || null,
        genre: sm.genre || null,
        overview: sm.overview || null,
        ratingJoint: null,
        ratingHim: null,
        ratingHer: null,
        dateAdded: new Date().toISOString().slice(0, 10),
      });
    }
  }

  selectedMovies = [];
  closeModal('modal-add');
  render();
  await saveToServer();
}

// ========== Watchlist Actions ==========
function openMarkWatchedModal(watchlistId) {
  const item = watchlist.find(w => w.id === watchlistId);
  if (!item) return;

  document.getElementById('mark-watched-id').value = item.id;
  document.getElementById('mark-watched-title').textContent = item.title;

  document.getElementById('mark-rating-joint').checked = true;
  document.getElementById('mark-joint-rating').style.display = 'block';
  document.getElementById('mark-individual-rating').style.display = 'none';
  document.getElementById('mark-rate-joint').value = 7;
  document.getElementById('mark-rate-him').value = 7;
  document.getElementById('mark-rate-her').value = 7;
  updateSliderDisplay('mark-rate-joint', 'mark-rate-joint-val');
  updateSliderDisplay('mark-rate-him', 'mark-rate-him-val');
  updateSliderDisplay('mark-rate-her', 'mark-rate-her-val');

  document.getElementById('modal-mark-watched').style.display = 'flex';
}

async function submitMarkWatched() {
  const id = document.getElementById('mark-watched-id').value;
  const idx = watchlist.findIndex(w => w.id === id);
  if (idx === -1) return;

  const item = watchlist[idx];
  const isJoint = document.getElementById('mark-rating-joint').checked;

  movies.push({
    id: generateId(),
    tmdbId: item.tmdbId,
    title: item.title,
    year: item.year,
    poster: item.poster,
    genre: item.genre,
    overview: item.overview,
    ratingJoint: isJoint ? parseFloat(document.getElementById('mark-rate-joint').value) : null,
    ratingHim: !isJoint ? parseFloat(document.getElementById('mark-rate-him').value) : null,
    ratingHer: !isJoint ? parseFloat(document.getElementById('mark-rate-her').value) : null,
    dateAdded: new Date().toISOString().slice(0, 10),
  });

  watchlist.splice(idx, 1);
  closeModal('modal-mark-watched');
  render();
  await saveToServer();
}

async function removeFromWatchlist(id) {
  if (!confirm('Remover este filme da sua lista?')) return;
  watchlist = watchlist.filter(w => w.id !== id);
  render();
  await saveToServer();
}

// Mark-watched rating type toggle
document.querySelectorAll('input[name="mark-rating-type"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isJoint = document.getElementById('mark-rating-joint').checked;
    document.getElementById('mark-joint-rating').style.display = isJoint ? 'block' : 'none';
    document.getElementById('mark-individual-rating').style.display = isJoint ? 'none' : 'block';
  });
});

// Mark-watched slider displays
['mark-rate-joint', 'mark-rate-him', 'mark-rate-her'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => updateSliderDisplay(id, id + '-val'));
});

// ========== Detail Modal ==========
async function openDetailModal(movieId) {
  const movie = movies.find(m => m.id === movieId);
  if (!movie) return;

  const content = document.getElementById('detail-content');
  content.innerHTML = renderDetailBasic(movie);
  document.getElementById('modal-detail').style.display = 'flex';

  if (movie.tmdbId) {
    try {
      const details = await api('details', { tmdbId: movie.tmdbId });
      content.innerHTML = renderDetailFull(movie, details);
    } catch (err) {
      console.error('Erro ao buscar detalhes:', err);
    }
  }
}

function buildRatingHtml(movie) {
  let parts = [];
  if (movie.ratingJoint !== null && movie.ratingJoint !== undefined) {
    parts.push(`<span class="detail-rating-item">Nota Conjunta: <strong>${formatRating(movie.ratingJoint)}</strong></span>`);
  }
  if (movie.ratingHim !== null && movie.ratingHim !== undefined) {
    parts.push(`<span class="detail-rating-item">👨 Dele: <strong>${formatRating(movie.ratingHim)}</strong></span>`);
  }
  if (movie.ratingHer !== null && movie.ratingHer !== undefined) {
    parts.push(`<span class="detail-rating-item">👩 Dela: <strong>${formatRating(movie.ratingHer)}</strong></span>`);
  }
  if (parts.length === 0) {
    return '<div class="detail-no-rating">Sem nota ainda</div>';
  }
  return `<div class="detail-user-ratings">${parts.join('')}</div>`;
}

function renderDetailBasic(movie) {
  return `
    <div class="detail-header">
      ${movie.poster ? `<img class="detail-poster" src="${escapeHtml(movie.poster)}" alt="${escapeHtml(movie.title)}">` : '<div class="detail-poster-empty">🎬</div>'}
      <div class="detail-info">
        <h2>${escapeHtml(movie.title)}</h2>
        <div class="detail-meta">
          ${movie.year ? `<span>${movie.year}</span>` : ''}
          ${movie.genre ? `<span>${escapeHtml(movie.genre)}</span>` : ''}
        </div>
        ${buildRatingHtml(movie)}
      </div>
    </div>
    ${movie.overview ? `<div class="detail-section"><h3>Sinopse</h3><p>${escapeHtml(movie.overview)}</p></div>` : ''}
    ${movie.tmdbId ? '<div class="detail-loading">Carregando detalhes do TMDB...</div>' : ''}
    <div class="detail-actions">
      <button class="btn-primary" onclick="closeModal('modal-detail'); openEditModal('${movie.id}')">Editar Notas</button>
    </div>
  `;
}

function renderDetailFull(movie, details) {
  const castHtml = (details.cast || []).map(c => `
    <div class="detail-cast-item">
      ${c.photo ? `<img src="${escapeHtml(c.photo)}" alt="${escapeHtml(c.name)}">` : '<div class="cast-no-photo">👤</div>'}
      <div class="cast-text">
        <span class="cast-name">${escapeHtml(c.name)}</span>
        <span class="cast-character">${escapeHtml(c.character)}</span>
      </div>
    </div>
  `).join('');

  const headerStyle = details.backdrop
    ? `style="background-image: linear-gradient(to bottom, rgba(30,30,42,0.6), rgba(30,30,42,1)), url('${escapeHtml(details.backdrop)}'); background-size: cover; background-position: center top;"`
    : '';

  return `
    <div class="detail-header" ${headerStyle}>
      ${details.poster || movie.poster ? `<img class="detail-poster" src="${escapeHtml(details.poster || movie.poster)}" alt="${escapeHtml(movie.title)}">` : '<div class="detail-poster-empty">🎬</div>'}
      <div class="detail-info">
        <h2>${escapeHtml(details.title || movie.title)}</h2>
        ${details.originalTitle && details.originalTitle !== details.title ? `<div class="detail-original-title">${escapeHtml(details.originalTitle)}</div>` : ''}
        <div class="detail-meta">
          ${details.year ? `<span>${details.year}</span>` : ''}
          ${details.runtime ? `<span>${details.runtime} min</span>` : ''}
          ${details.director ? `<span>Dir: ${escapeHtml(details.director)}</span>` : ''}
        </div>
        ${details.genres ? `<div class="detail-genres">${escapeHtml(details.genres)}</div>` : ''}
        ${details.voteAverage ? `<div class="detail-tmdb-score">TMDB: <strong>${details.voteAverage.toFixed(1)}</strong></div>` : ''}
        ${buildRatingHtml(movie)}
      </div>
    </div>
    ${details.overview ? `<div class="detail-section"><h3>Sinopse</h3><p>${escapeHtml(details.overview)}</p></div>` : ''}
    ${castHtml ? `<div class="detail-section"><h3>Elenco</h3><div class="detail-cast-grid">${castHtml}</div></div>` : ''}
    <div class="detail-actions">
      <button class="btn-primary" onclick="closeModal('modal-detail'); openEditModal('${movie.id}')">Editar Notas</button>
    </div>
  `;
}

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
  const hasIndividual = (movie.ratingHim !== null && movie.ratingHim !== undefined) ||
                        (movie.ratingHer !== null && movie.ratingHer !== undefined);

  if (hasJoint) {
    document.getElementById('edit-rating-joint').checked = true;
    document.getElementById('edit-joint-rating').style.display = 'block';
    document.getElementById('edit-individual-rating').style.display = 'none';
    document.getElementById('edit-rate-joint').value = movie.ratingJoint;
  } else if (hasIndividual) {
    document.getElementById('edit-rating-individual').checked = true;
    document.getElementById('edit-joint-rating').style.display = 'none';
    document.getElementById('edit-individual-rating').style.display = 'block';
    document.getElementById('edit-rate-him').value = movie.ratingHim ?? 5;
    document.getElementById('edit-rate-her').value = movie.ratingHer ?? 5;
  } else {
    document.getElementById('edit-rating-joint').checked = true;
    document.getElementById('edit-joint-rating').style.display = 'block';
    document.getElementById('edit-individual-rating').style.display = 'none';
    document.getElementById('edit-rate-joint').value = 7;
  }

  updateSliderDisplay('edit-rate-joint', 'edit-rate-joint-val');
  updateSliderDisplay('edit-rate-him', 'edit-rate-him-val');
  updateSliderDisplay('edit-rate-her', 'edit-rate-her-val');

  document.getElementById('modal-edit').style.display = 'flex';
}

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

['edit-rate-joint', 'edit-rate-him', 'edit-rate-her'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => updateSliderDisplay(id, id + '-val'));
});

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

// ========== Keyboard ==========
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
  }
});

// ========== Init ==========
tryAutoLogin();
