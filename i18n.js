// ========== Internationalization ==========
// Mechanism: t(key, ...args) + data-i18n attributes applied by applyTranslations().
// userLang persists in localStorage and defaults to the device language.

const translations = {
  "pt-BR": {
    // Meta
    pageTitle: "CineNotes | Avaliem filmes juntos",

    // Generic
    cancel: "Cancelar",
    save: "Salvar",
    remove: "Remover",
    close: "Fechar",
    loading: "Carregando...",
    seeAll: "Ver tudo",
    movies_one: "filme",
    movies_other: "filmes",
    nMovies: (n) => `${n} ${n === 1 ? "filme" : "filmes"}`,

    // Errors
    errServer: "O servidor respondeu de um jeito inesperado. Tente de novo.",
    errUnknown: "Algo deu errado. Tente novamente.",
    errCodeLength: "O código precisa ter entre 3 e 30 caracteres (letras, números, - e _).",
    errPasswordLength: "A senha precisa ter no mínimo 4 caracteres.",
    errCodeTaken: "Este código já está em uso. Escolham outro.",
    errRoomNotFound: "Sala não encontrada. Confira o código.",
    errWrongPassword: "Senha incorreta.",
    errOffline: "Sem conexão. As alterações serão salvas quando a internet voltar.",
    errSaveFailed: "Não foi possível salvar. Verifique a conexão.",

    // Login
    loginTagline: "O diário de cinema de vocês dois",
    loginSubtitle: "Watchlist compartilhada, notas a dois e um ranking que conta a história do casal.",
    tabEnter: "Entrar",
    tabCreate: "Criar sala",
    labelRoomCode: "Código da sala",
    labelPassword: "Senha",
    labelChooseCode: "Escolham um código",
    labelSetPassword: "Definam uma senha",
    placeholderCode: "ex: joao-maria",
    hintCode: "3 a 30 caracteres, sem espaços",
    hintPassword: "Mínimo de 4 caracteres",
    btnEnter: "Entrar",
    btnCreateRoom: "Criar sala",
    creatingRoom: "Criando sala...",
    entering: "Entrando...",
    roomCreated: "Sala criada! Entrando...",
    loginChip1: "Sem cadastro",
    loginChip2: "Notas a dois",
    loginChip3: "Recomendações",

    // Bottom nav
    navHome: "Início",
    navLibrary: "Filmes",
    navWatchlist: "Lista",
    navStats: "Resumo",
    navAdd: "Adicionar",

    // Home
    greetingMorning: "Bom dia",
    greetingAfternoon: "Boa tarde",
    greetingEvening: "Boa noite",
    homeSubtitle: "O que vamos assistir hoje?",
    tonightTitle: "Sessão de hoje",
    tonightKicker: "Sugestão da watchlist",
    tonightShuffle: "Sortear outro",
    tonightWatched: "Já vimos",
    tonightEmptyTitle: "A watchlist está vazia",
    tonightEmptyDesc: "Salvem filmes que querem ver juntos e o CineNotes sorteia a sessão de hoje.",
    tonightEmptyAction: "Montar watchlist",
    pendingTitle: (n) => (n === 1 ? "1 filme sem nota" : `${n} filmes sem nota`),
    pendingDesc: "Deem a nota enquanto a lembrança está fresca.",
    pendingRate: "Avaliar",
    rowWatchlist: "Na fila de vocês",
    rowTop: "Top do casal",
    rowRecs: "Descobertas para vocês",
    recsPersonalized: (n) => `Baseado em ${n} ${n === 1 ? "sinal" : "sinais"} do gosto de vocês`,
    recsTrending: "Em alta esta semana",
    recsHintAddMore: (n) => `Avaliem ou salvem mais ${n} ${n === 1 ? "filme" : "filmes"} para personalizar as sugestões.`,
    recsRefresh: "Atualizar sugestões",
    recsNotInterested: "Não me interessa",
    recsBecause: (t) => `Porque curtiram “${t}”`,
    emptyHomeTitle: "Bem-vindos ao CineNotes",
    emptyHomeDesc: "Comecem adicionando um filme que assistiram juntos ou montando a watchlist da próxima sessão.",
    emptyHomeAction: "Adicionar primeiro filme",

    // Library
    libraryTitle: "Filmes",
    searchLibrary: "Buscar nos filmes de vocês...",
    segCouple: "Casal",
    segHis: "Dele",
    segHers: "Dela",
    segRecent: "Recentes",
    unrated: "Sem nota",
    emptyLibraryTitle: "Nenhum filme avaliado ainda",
    emptyLibraryDesc: "Adicionem os filmes que já assistiram juntos para montar o ranking.",
    emptyLibraryAction: "Adicionar filme",
    emptySegTitle: "Nenhuma nota individual ainda",
    emptySegDesc: "Usem notas individuais ao avaliar para montar este ranking.",
    noSearchResults: (q) => `Nada encontrado para “${q}”.`,

    // Watchlist
    watchlistTitle: "Watchlist",
    watchlistSubtitle: "A fila de filmes para as próximas sessões.",
    markWatched: "Já vimos",
    emptyWatchlistTitle: "Nada na fila ainda",
    emptyWatchlistDesc: "Salvem os filmes que querem ver juntos e nunca mais fiquem 40 minutos escolhendo.",
    emptyWatchlistAction: "Adicionar à watchlist",

    // Stats
    statsTitle: "Resumo do casal",
    statMovies: "Filmes vistos",
    statAvg: "Nota média",
    statThisYear: (y) => `Vistos em ${y}`,
    statWatchlist: "Na watchlist",
    hisVsHers: "Ele × Ela",
    avgHis: "Média dele",
    avgHers: "Média dela",
    agreementTitle: "Sintonia do casal",
    agreementDesc: (n) => `Baseado em ${n} ${n === 1 ? "filme com notas individuais" : "filmes com notas individuais"}`,
    agreementNone: "Avaliem filmes com notas individuais para medir a sintonia.",
    biggestFight: "Maior treta",
    heGave: "ele deu",
    sheGave: "ela deu",
    topGenres: "Gêneros favoritos",
    byDecade: "Por década",
    bestMovie: "Melhor filme",
    worstMovie: "Pior filme",
    statsEmptyTitle: "Ainda sem dados",
    statsEmptyDesc: "Avaliem alguns filmes e esta página vira o retrato cinéfilo do casal.",

    // Add sheet
    addTitle: "Adicionar filme",
    addSearchPlaceholder: "Busque pelo nome do filme...",
    addSearchHint: "Digite pelo menos 2 letras para buscar no TMDB.",
    addSearching: "Buscando...",
    addNoResults: (q) => `Nenhum filme encontrado para “${q}”.`,
    inLibrary: "No ranking",
    inWatchlist: "Na lista",
    actionToWatchlist: "Lista",
    actionWatched: "Já vimos",

    // Rate sheet
    rateTitle: "Como foi?",
    rateModeJoint: "Nota do casal",
    rateModeIndividual: "Notas individuais",
    coupleRating: "Nota conjunta",
    hisRating: "Nota dele",
    herRating: "Nota dela",
    saveRating: "Salvar nota",
    rateLater: "Avaliar depois",

    // Detail sheet
    directedBy: "Direção",
    castTitle: "Elenco",
    overviewTitle: "Sinopse",
    ratingsTitle: "Notas",
    jointLabel: "Casal",
    hisLabel: "Ele",
    herLabel: "Ela",
    editRatings: "Editar notas",
    rateMovie: "Dar nota",
    deleteMovie: "Excluir filme",
    confirmDelete: "Excluir este filme do ranking?",
    confirmRemoveWatchlist: "Remover este filme da watchlist?",
    addedOn: (d) => `Adicionado em ${d}`,
    tmdbScore: "Nota TMDB",
    runtimeMin: (m) => `${m} min`,
    editDetails: "Editar detalhes",
    labelTitle: "Título",
    labelYear: "Ano",
    labelGenre: "Gênero",
    labelPoster: "URL do cartaz",

    // Settings
    settingsTitle: "Ajustes",
    roomLabel: "Sala",
    languageLabel: "Idioma",
    logout: "Sair da sala",
    confirmLogout: "Sair da sala neste aparelho?",
    settingsAbout: "Feito para casais que amam cinema. Os dados ficam salvos na nuvem, na sala de vocês.",

    // Toasts
    toastSaved: "Alterações salvas",
    toastAddedWatchlist: (t) => `“${t}” foi para a watchlist`,
    toastAddedLibrary: (t) => `“${t}” adicionado aos filmes`,
    toastRemoved: (t) => `“${t}” removido`,
    toastDismissed: "Ok, não vamos mais sugerir esse.",
    toastUndo: "Desfazer",
  },

  en: {
    // Meta
    pageTitle: "CineNotes | Rate movies together",

    // Generic
    cancel: "Cancel",
    save: "Save",
    remove: "Remove",
    close: "Close",
    loading: "Loading...",
    seeAll: "See all",
    nMovies: (n) => `${n} ${n === 1 ? "movie" : "movies"}`,

    // Errors
    errServer: "The server answered in an unexpected way. Try again.",
    errUnknown: "Something went wrong. Try again.",
    errCodeLength: "The code must be 3-30 characters (letters, numbers, - and _).",
    errPasswordLength: "The password must be at least 4 characters.",
    errCodeTaken: "That code is taken. Pick another one.",
    errRoomNotFound: "Room not found. Check the code.",
    errWrongPassword: "Wrong password.",
    errOffline: "You're offline. Changes will sync when you're back.",
    errSaveFailed: "Couldn't save. Check your connection.",

    // Login
    loginTagline: "The movie diary for the two of you",
    loginSubtitle: "A shared watchlist, ratings for two and a ranking that tells your story as a couple.",
    tabEnter: "Sign in",
    tabCreate: "Create room",
    labelRoomCode: "Room code",
    labelPassword: "Password",
    labelChooseCode: "Pick a code",
    labelSetPassword: "Set a password",
    placeholderCode: "e.g. john-jane",
    hintCode: "3-30 characters, no spaces",
    hintPassword: "At least 4 characters",
    btnEnter: "Enter",
    btnCreateRoom: "Create room",
    creatingRoom: "Creating room...",
    entering: "Entering...",
    roomCreated: "Room created! Entering...",
    loginChip1: "No sign-up",
    loginChip2: "Ratings for two",
    loginChip3: "Recommendations",

    // Bottom nav
    navHome: "Home",
    navLibrary: "Movies",
    navWatchlist: "Queue",
    navStats: "Stats",
    navAdd: "Add",

    // Home
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    homeSubtitle: "What are we watching today?",
    tonightTitle: "Tonight's pick",
    tonightKicker: "From your watchlist",
    tonightShuffle: "Shuffle",
    tonightWatched: "Watched it",
    tonightEmptyTitle: "Your watchlist is empty",
    tonightEmptyDesc: "Save movies you want to watch together and CineNotes will pick tonight's session.",
    tonightEmptyAction: "Build the watchlist",
    pendingTitle: (n) => (n === 1 ? "1 movie awaiting a rating" : `${n} movies awaiting ratings`),
    pendingDesc: "Rate them while the memory is fresh.",
    pendingRate: "Rate",
    rowWatchlist: "Up next",
    rowTop: "Your top picks",
    rowRecs: "Discoveries for you two",
    recsPersonalized: (n) => `Based on ${n} taste ${n === 1 ? "signal" : "signals"}`,
    recsTrending: "Trending this week",
    recsHintAddMore: (n) => `Rate or save ${n} more ${n === 1 ? "movie" : "movies"} to personalize suggestions.`,
    recsRefresh: "Refresh suggestions",
    recsNotInterested: "Not interested",
    recsBecause: (t) => `Because you liked “${t}”`,
    emptyHomeTitle: "Welcome to CineNotes",
    emptyHomeDesc: "Start by adding a movie you watched together, or build the watchlist for your next session.",
    emptyHomeAction: "Add your first movie",

    // Library
    libraryTitle: "Movies",
    searchLibrary: "Search your movies...",
    segCouple: "Couple",
    segHis: "His",
    segHers: "Hers",
    segRecent: "Recent",
    unrated: "Unrated",
    emptyLibraryTitle: "No rated movies yet",
    emptyLibraryDesc: "Add the movies you've watched together to build your ranking.",
    emptyLibraryAction: "Add a movie",
    emptySegTitle: "No individual ratings yet",
    emptySegDesc: "Use individual ratings when rating to build this ranking.",
    noSearchResults: (q) => `Nothing found for “${q}”.`,

    // Watchlist
    watchlistTitle: "Watchlist",
    watchlistSubtitle: "Your queue for the next movie nights.",
    markWatched: "Watched it",
    emptyWatchlistTitle: "Nothing queued yet",
    emptyWatchlistDesc: "Save the movies you want to watch together and never spend 40 minutes choosing again.",
    emptyWatchlistAction: "Add to watchlist",

    // Stats
    statsTitle: "Couple recap",
    statMovies: "Movies watched",
    statAvg: "Average rating",
    statThisYear: (y) => `Watched in ${y}`,
    statWatchlist: "In the watchlist",
    hisVsHers: "Him × Her",
    avgHis: "His average",
    avgHers: "Her average",
    agreementTitle: "Couple sync",
    agreementDesc: (n) => `Based on ${n} ${n === 1 ? "movie with individual ratings" : "movies with individual ratings"}`,
    agreementNone: "Rate movies with individual scores to measure your sync.",
    biggestFight: "Biggest disagreement",
    heGave: "he gave",
    sheGave: "she gave",
    topGenres: "Favorite genres",
    byDecade: "By decade",
    bestMovie: "Best movie",
    worstMovie: "Worst movie",
    statsEmptyTitle: "No data yet",
    statsEmptyDesc: "Rate a few movies and this page becomes your couple's film portrait.",

    // Add sheet
    addTitle: "Add a movie",
    addSearchPlaceholder: "Search by movie title...",
    addSearchHint: "Type at least 2 letters to search TMDB.",
    addSearching: "Searching...",
    addNoResults: (q) => `No movies found for “${q}”.`,
    inLibrary: "In ranking",
    inWatchlist: "Queued",
    actionToWatchlist: "Queue",
    actionWatched: "Watched",

    // Rate sheet
    rateTitle: "How was it?",
    rateModeJoint: "Couple rating",
    rateModeIndividual: "Individual ratings",
    coupleRating: "Joint rating",
    hisRating: "His rating",
    herRating: "Her rating",
    saveRating: "Save rating",
    rateLater: "Rate later",

    // Detail sheet
    directedBy: "Directed by",
    castTitle: "Cast",
    overviewTitle: "Overview",
    ratingsTitle: "Ratings",
    jointLabel: "Couple",
    hisLabel: "Him",
    herLabel: "Her",
    editRatings: "Edit ratings",
    rateMovie: "Rate it",
    deleteMovie: "Delete movie",
    confirmDelete: "Delete this movie from the ranking?",
    confirmRemoveWatchlist: "Remove this movie from the watchlist?",
    addedOn: (d) => `Added on ${d}`,
    tmdbScore: "TMDB score",
    runtimeMin: (m) => `${m} min`,
    editDetails: "Edit details",
    labelTitle: "Title",
    labelYear: "Year",
    labelGenre: "Genre",
    labelPoster: "Poster URL",

    // Settings
    settingsTitle: "Settings",
    roomLabel: "Room",
    languageLabel: "Language",
    logout: "Leave room",
    confirmLogout: "Leave the room on this device?",
    settingsAbout: "Made for couples who love movies. Your data lives in the cloud, inside your room.",

    // Toasts
    toastSaved: "Changes saved",
    toastAddedWatchlist: (t) => `“${t}” added to the watchlist`,
    toastAddedLibrary: (t) => `“${t}” added to your movies`,
    toastRemoved: (t) => `“${t}” removed`,
    toastDismissed: "Got it — we won't suggest that one again.",
    toastUndo: "Undo",
  },
};

// ---- Language state ----
let userLang = (() => {
  const stored = localStorage.getItem("cinenotes_lang");
  if (stored && translations[stored]) return stored;
  const nav = (navigator.language || "pt-BR").toLowerCase();
  return nav.startsWith("pt") ? "pt-BR" : "en";
})();

function t(key, ...args) {
  const dict = translations[userLang] || translations["pt-BR"];
  let value = dict[key];
  if (value === undefined) value = translations["pt-BR"][key];
  if (value === undefined) return key;
  return typeof value === "function" ? value(...args) : value;
}

function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
  document.documentElement.lang = userLang;
  document.title = t("pageTitle");
}

function setLanguage(lang) {
  if (!translations[lang]) return;
  userLang = lang;
  localStorage.setItem("cinenotes_lang", lang);
  applyTranslations();
  // Let the app re-render dynamic content in the new language.
  if (typeof window.onLanguageChange === "function") window.onLanguageChange();
}
