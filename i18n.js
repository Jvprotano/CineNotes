// ========== Internationalization ==========
const translations = {
  "pt-BR": {
    // Page & SEO
    pageTitle: "CineNotes - Avaliem Filmes Juntos",
    metaDescription:
      "CineNotes: app para casais avaliarem filmes juntos, criarem uma watchlist privada e montarem um ranking com notas individuais ou conjuntas.",
    metaKeywords:
      "avaliacao de filmes em casal, ranking de filmes, watchlist de casal, avaliar filmes juntos, couple movie rating, movie ranking app, cinenotes",
    ogTitle: "CineNotes - Avaliem Filmes Juntos",
    ogDescription:
      "Sala privada para casais avaliarem filmes, salvarem a watchlist e criarem um ranking compartilhado com visual premium.",
    twitterDescription:
      "O app para casais montarem uma watchlist, avaliarem filmes juntos e descobrirem recomendações melhores.",
    ogImageAlt: "CineNotes - Avaliem filmes juntos como casal",
    schemaDescription:
      "Web app para casais avaliarem filmes juntos, manterem uma watchlist privada e criarem rankings compartilhados.",

    // Login
    loginSubtitle:
      "Um espaço privado para o casal guardar a watchlist, avaliar o que já viu e transformar cada sessão em um ranking bonito de acompanhar.",
    tabEnter: "Entrar",
    tabCreate: "Criar sala",
    labelRoomCode: "Código da sala",
    labelPassword: "Senha",
    labelChooseCode: "Escolha um código",
    labelSetPassword: "Defina uma senha",
    placeholderCode: "ex: joao-maria",
    hintMinChars: "Mínimo de 3 caracteres, sem espaços",
    hintMinPassword: "Mínimo de 4 caracteres",
    btnEnter: "Entrar",
    btnCreateRoom: "Criar sala",
    highlightNoSignup: "Sem cadastro",
    highlightWatchlist: "Watchlist",
    highlightCoupleRanking: "Ranking do casal",

    // Header
    roomActive: "Sala ativa",
    headerSubtitle:
      "Organize a próxima sessão, descubra novos filmes e mantenha o ranking do casal em dia.",
    btnAddMovie: "Adicionar filme",
    btnLogoutTitle: "Sair da sala",

    // Tabs
    tabHome: "Início",
    tabRanking: "Ranking",
    tabHis: "Dele",
    tabHers: "Dela",
    tabAll: "Todos",

    // Saving
    savingChanges: "Salvando alterações...",

    // Watchlist section
    myList: "Minha lista",
    myListDesc:
      "Filmes que ainda estão no radar antes de entrar no ranking.",
    addToList: "Adicionar à lista",
    emptyListTitle: "Nada salvo por aqui ainda",
    emptyListDesc:
      "Guardem os próximos filmes que querem ver juntos e montem a fila da próxima maratona.",

    // Recommendations
    discoveries: "Descobertas",
    recommendations: "Recomendações",
    recsDesc:
      "Sugestões calibradas pelo histórico de vocês e pelo que está em alta agora.",
    refreshRecsTitle: "Atualizar recomendações",
    loadingRecs: "Carregando recomendações...",
    basedOnSignals: (n) => `Baseado em ${n} sinais do perfil`,
    trendingThisWeek: "Em alta esta semana",
    addMoreMovies: (n) =>
      `Adicionem mais <strong>${n}</strong> filme${n > 1 ? "s" : ""} avaliado${n > 1 ? "s" : ""} ou salvo na watchlist para personalizar melhor.`,
    noStrongRecs:
      "Não apareceu um conjunto forte de recomendações personalizadas com o histórico atual, então o app mostrou os destaques do momento.",
    alreadyAdded: "Já adicionado",
    addToMyList: "Lista",
    watched: "Assistido",

    // Add modal
    catalog: "Catálogo",
    addMovies: "Adicionar filmes",
    addToMyListModal: "Adicionar à minha lista",
    searchMovie: "Buscar filme",
    searchPlaceholder: "Digite o nome do filme...",
    btnSearch: "Buscar",
    searchingMovies: "Buscando filmes...",
    noResults: "Nenhum resultado encontrado.",
    selectedMovies: "Filmes selecionados",
    addNToList: (n) => `Adicionar ${n} à minha lista`,
    addNMovies: (n) =>
      `Adicionar ${n} filme${n > 1 ? "s" : ""}`,
    remove: "Remover",

    // Edit modal
    quickEdit: "Ajuste rápido",
    editMovie: "Editar filme",
    labelTitle: "Título",
    labelYear: "Ano",
    labelPosterUrl: "URL do cartaz",
    labelGenre: "Gênero",
    ratingsTitle: "Notas de 0 a 10",
    jointRating: "Nota conjunta",
    individualRatings: "Notas individuais",
    coupleRating: "Nota do casal",
    hisRating: "Nota dele",
    herRating: "Nota dela",
    saveChanges: "Salvar alterações",
    deleteBtn: "Excluir",

    // Detail modal
    movieSheet: "Ficha do filme",
    details: "Detalhes",
    synopsis: "Sinopse",
    cast: "Elenco",
    direction: "Direção",
    loadingDetails: "Carregando detalhes...",
    noRatingYet: "Sem nota ainda",
    jointLabel: "Nota Conjunta",
    hisLabel: "Dele",
    herLabel: "Dela",
    editNotes: "Editar notas",
    myListBtn: "Minha lista",
    removeBtn: "Remover",
    movieDetails: "Detalhes do filme",

    // Mark watched modal
    markAsWatched: "Marcar como assistido",
    saveAndMove: "Salvar e mover para o ranking",

    // Ranking labels
    rankingGeneral: "Ranking Geral",
    rankingHis: "Ranking Dele",
    rankingHers: "Ranking Dela",
    allMovies: "Todos os Filmes",
    ranking: "Ranking",

    // Cards
    noRating: "Sem nota",
    joint: "Conjunta",
    nMovies: (n) => `${n} filme${n !== 1 ? "s" : ""}`,

    // Stats
    library: "Biblioteca",
    moviesInRanking: (n) =>
      `filme${n > 1 ? "s" : ""} já entrou${n > 1 ? "ram" : "u"} no ranking`,
    average: "Média",
    consolidatedAvg: "nota consolidada do histórico do casal",
    watchlistLabel: "Watchlist",
    awaitingSession: (n) =>
      `filme${n === 1 ? "" : "s"} esperando a próxima sessão`,
    currentTop: "Top atual",
    addNotesToHighlight: "Adicionem notas para destacar um favorito",

    // Pending banner
    pendingBanner: (n, text) =>
      `<strong>${n}</strong> filme${n > 1 ? "s" : ""} ainda precisa${n > 1 ? "m" : ""} de nota. Comecem por ${text}.`,
    andMore: (n) => `e mais ${n}`,
    rateNow: "Avaliar agora",

    // Empty states
    emptyRanking: {
      kicker: "Ranking vazio",
      title: "Ainda não existe ranking por aqui",
      description:
        "Adicionem os filmes que vocês já assistiram e preencham as notas para começar o ranking do casal.",
      actionLabel: "Adicionar filmes assistidos",
    },
    emptyHisNoMovies: {
      kicker: "Sem filmes",
      title: "Ainda não há filmes para o ranking dele",
      description:
        "Adicionem os filmes que vocês já assistiram e depois registrem as notas dele para liberar esta visão.",
      actionLabel: "Adicionar filmes assistidos",
    },
    emptyHisPending: {
      kicker: "Notas pendentes",
      title: "Ainda faltam as notas dele",
      description:
        "Editem os filmes já assistidos e preencham as notas dele para montar esse ranking.",
      actionLabel: "Adicionar notas",
    },
    emptyHersNoMovies: {
      kicker: "Sem filmes",
      title: "Ainda não há filmes para o ranking dela",
      description:
        "Adicionem os filmes que vocês já assistiram e depois registrem as notas dela para liberar esta visão.",
      actionLabel: "Adicionar filmes assistidos",
    },
    emptyHersPending: {
      kicker: "Notas pendentes",
      title: "Ainda faltam as notas dela",
      description:
        "Editem os filmes já assistidos e preencham as notas dela para montar esse ranking.",
      actionLabel: "Adicionar notas",
    },
    emptyAll: {
      kicker: "Biblioteca vazia",
      title: "Nenhum filme assistido foi adicionado",
      description:
        "Adicionem os filmes que vocês já viram e aproveitem para registrar as notas de cada sessão.",
      actionLabel: "Adicionar filmes assistidos",
    },
    emptyDefault: {
      kicker: "Comecem por aqui",
      title: "O ranking ainda está em branco",
      description:
        "Adicionem os filmes assistidos ou montem a watchlist para a experiência ficar completa.",
      actionLabel: "Adicionar primeiro filme",
    },

    // Errors
    errCodeLength: "Código deve ter entre 3 e 30 caracteres",
    errPasswordLength: "Senha deve ter no mínimo 4 caracteres",
    errCodeTaken: "Este código já está em uso. Escolha outro.",
    errRoomNotFound: "Sala não encontrada",
    errWrongPassword: "Senha incorreta",
    errServer:
      "Erro no servidor. Verifique se o Blob Store está conectado ao projeto na Vercel.",
    errUnknown: "Erro desconhecido",
    errSave: (msg) => "Erro ao salvar: " + msg,
    roomCreated: "Sala criada! Entrando...",
    confirmRemoveFromList: "Remover este filme da sua lista?",
    confirmDelete: "Tem certeza que deseja excluir este filme?",
  },

  en: {
    // Page & SEO
    pageTitle: "CineNotes - Rate Movies Together",
    metaDescription:
      "CineNotes: the app for couples to rate movies together, build a private watchlist, and create a shared ranking with individual or joint ratings.",
    metaKeywords:
      "couple movie rating, movie ranking app, watchlist for couples, rate movies together, shared movie list, cinenotes, movie night tracker",
    ogTitle: "CineNotes - Rate Movies Together",
    ogDescription:
      "A private room for couples to rate movies, save their watchlist, and build a shared ranking with a premium look.",
    twitterDescription:
      "The app for couples to build a watchlist, rate movies together, and get better recommendations.",
    ogImageAlt: "CineNotes - Rate movies together as a couple",
    schemaDescription:
      "Web app for couples to rate movies together, maintain a private watchlist, and create shared rankings.",

    // Login
    loginSubtitle:
      "A private space for couples to save their watchlist, rate what they've watched, and build a beautiful ranking together.",
    tabEnter: "Enter",
    tabCreate: "Create room",
    labelRoomCode: "Room code",
    labelPassword: "Password",
    labelChooseCode: "Choose a code",
    labelSetPassword: "Set a password",
    placeholderCode: "e.g. john-jane",
    hintMinChars: "At least 3 characters, no spaces",
    hintMinPassword: "At least 4 characters",
    btnEnter: "Enter",
    btnCreateRoom: "Create room",
    highlightNoSignup: "No signup",
    highlightWatchlist: "Watchlist",
    highlightCoupleRanking: "Couple ranking",

    // Header
    roomActive: "Active room",
    headerSubtitle:
      "Plan the next session, discover new movies, and keep your couple ranking up to date.",
    btnAddMovie: "Add movie",
    btnLogoutTitle: "Leave room",

    // Tabs
    tabHome: "Home",
    tabRanking: "Ranking",
    tabHis: "His",
    tabHers: "Hers",
    tabAll: "All",

    // Saving
    savingChanges: "Saving changes...",

    // Watchlist section
    myList: "My list",
    myListDesc: "Movies still on the radar before making it to the ranking.",
    addToList: "Add to list",
    emptyListTitle: "Nothing saved here yet",
    emptyListDesc:
      "Save the movies you want to watch together and build the queue for your next marathon.",

    // Recommendations
    discoveries: "Discoveries",
    recommendations: "Recommendations",
    recsDesc:
      "Suggestions based on your history and what's trending right now.",
    refreshRecsTitle: "Refresh recommendations",
    loadingRecs: "Loading recommendations...",
    basedOnSignals: (n) => `Based on ${n} profile signals`,
    trendingThisWeek: "Trending this week",
    addMoreMovies: (n) =>
      `Add <strong>${n}</strong> more rated or watchlisted movie${n > 1 ? "s" : ""} to improve recommendations.`,
    noStrongRecs:
      "No strong personalized recommendations were found for your current profile, so here are this week's highlights.",
    alreadyAdded: "Already added",
    addToMyList: "List",
    watched: "Watched",

    // Add modal
    catalog: "Catalog",
    addMovies: "Add movies",
    addToMyListModal: "Add to my list",
    searchMovie: "Search movie",
    searchPlaceholder: "Type the movie name...",
    btnSearch: "Search",
    searchingMovies: "Searching movies...",
    noResults: "No results found.",
    selectedMovies: "Selected movies",
    addNToList: (n) => `Add ${n} to my list`,
    addNMovies: (n) => `Add ${n} movie${n > 1 ? "s" : ""}`,
    remove: "Remove",

    // Edit modal
    quickEdit: "Quick edit",
    editMovie: "Edit movie",
    labelTitle: "Title",
    labelYear: "Year",
    labelPosterUrl: "Poster URL",
    labelGenre: "Genre",
    ratingsTitle: "Ratings from 0 to 10",
    jointRating: "Joint rating",
    individualRatings: "Individual ratings",
    coupleRating: "Couple rating",
    hisRating: "His rating",
    herRating: "Her rating",
    saveChanges: "Save changes",
    deleteBtn: "Delete",

    // Detail modal
    movieSheet: "Movie details",
    details: "Details",
    synopsis: "Synopsis",
    cast: "Cast",
    direction: "Director",
    loadingDetails: "Loading details...",
    noRatingYet: "No rating yet",
    jointLabel: "Joint Rating",
    hisLabel: "His",
    herLabel: "Hers",
    editNotes: "Edit ratings",
    myListBtn: "My list",
    removeBtn: "Remove",
    movieDetails: "Movie details",

    // Mark watched modal
    markAsWatched: "Mark as watched",
    saveAndMove: "Save and move to ranking",

    // Ranking labels
    rankingGeneral: "Overall Ranking",
    rankingHis: "His Ranking",
    rankingHers: "Her Ranking",
    allMovies: "All Movies",
    ranking: "Ranking",

    // Cards
    noRating: "No rating",
    joint: "Joint",
    nMovies: (n) => `${n} movie${n !== 1 ? "s" : ""}`,

    // Stats
    library: "Library",
    moviesInRanking: (n) =>
      `movie${n > 1 ? "s" : ""} in the ranking`,
    average: "Average",
    consolidatedAvg: "consolidated rating from the couple's history",
    watchlistLabel: "Watchlist",
    awaitingSession: (n) =>
      `movie${n === 1 ? "" : "s"} awaiting the next session`,
    currentTop: "Current top",
    addNotesToHighlight: "Add ratings to highlight a favorite",

    // Pending banner
    pendingBanner: (n, text) =>
      `<strong>${n}</strong> movie${n > 1 ? "s" : ""} still need${n > 1 ? "" : "s"} a rating. Start with ${text}.`,
    andMore: (n) => `and ${n} more`,
    rateNow: "Rate now",

    // Empty states
    emptyRanking: {
      kicker: "Empty ranking",
      title: "No ranking here yet",
      description:
        "Add the movies you've watched and fill in the ratings to start your couple ranking.",
      actionLabel: "Add watched movies",
    },
    emptyHisNoMovies: {
      kicker: "No movies",
      title: "No movies for his ranking yet",
      description:
        "Add the movies you've watched and then fill in his ratings to unlock this view.",
      actionLabel: "Add watched movies",
    },
    emptyHisPending: {
      kicker: "Pending ratings",
      title: "His ratings are still missing",
      description:
        "Edit the watched movies and fill in his ratings to build this ranking.",
      actionLabel: "Add ratings",
    },
    emptyHersNoMovies: {
      kicker: "No movies",
      title: "No movies for her ranking yet",
      description:
        "Add the movies you've watched and then fill in her ratings to unlock this view.",
      actionLabel: "Add watched movies",
    },
    emptyHersPending: {
      kicker: "Pending ratings",
      title: "Her ratings are still missing",
      description:
        "Edit the watched movies and fill in her ratings to build this ranking.",
      actionLabel: "Add ratings",
    },
    emptyAll: {
      kicker: "Empty library",
      title: "No watched movies added",
      description:
        "Add the movies you've watched and take the chance to rate each session.",
      actionLabel: "Add watched movies",
    },
    emptyDefault: {
      kicker: "Start here",
      title: "The ranking is still blank",
      description:
        "Add watched movies or build your watchlist to get the full experience.",
      actionLabel: "Add first movie",
    },

    // Errors
    errCodeLength: "Code must be between 3 and 30 characters",
    errPasswordLength: "Password must be at least 4 characters",
    errCodeTaken: "This code is already in use. Choose another.",
    errRoomNotFound: "Room not found",
    errWrongPassword: "Wrong password",
    errServer:
      "Server error. Check if the Blob Store is connected to the project on Vercel.",
    errUnknown: "Unknown error",
    errSave: (msg) => "Error saving: " + msg,
    roomCreated: "Room created! Entering...",
    confirmRemoveFromList: "Remove this movie from your list?",
    confirmDelete: "Are you sure you want to delete this movie?",
  },
};

// Detect language: Portuguese for pt-*, English for everything else
const userLang = (() => {
  const nav = navigator.language || navigator.userLanguage || "en";
  return nav.startsWith("pt") ? "pt-BR" : "en";
})();

function t(key, ...args) {
  // Support dot notation for nested keys (e.g. "emptyDefault.title")
  let val;
  if (key.includes(".")) {
    const [first, second] = key.split(".");
    val = (translations[userLang][first] ?? translations["pt-BR"][first] ?? {})[second] ?? key;
  } else {
    val = translations[userLang][key] ?? translations["pt-BR"][key] ?? key;
  }
  if (typeof val === "function") return val(...args);
  return val;
}

// Apply translations to HTML elements with data-i18n attributes
function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  // Update page title & html lang
  document.title = t("pageTitle");
  document.documentElement.lang = userLang === "pt-BR" ? "pt-BR" : "en";

  // SEO meta tags
  const metaMap = {
    'meta[name="description"]': t("metaDescription"),
    'meta[name="title"]': t("ogTitle"),
    'meta[name="keywords"]': t("metaKeywords"),
    'meta[name="language"]': userLang === "pt-BR" ? "pt-BR" : "en",
    'meta[property="og:title"]': t("ogTitle"),
    'meta[property="og:description"]': t("ogDescription"),
    'meta[property="og:image:alt"]': t("ogImageAlt"),
    'meta[property="og:locale"]': userLang === "pt-BR" ? "pt_BR" : "en_US",
    'meta[property="og:locale:alternate"]': userLang === "pt-BR" ? "en_US" : "pt_BR",
    'meta[name="twitter:title"]': t("ogTitle"),
    'meta[name="twitter:description"]': t("twitterDescription"),
    'meta[name="twitter:image:alt"]': t("ogImageAlt"),
  };
  for (const [selector, value] of Object.entries(metaMap)) {
    const el = document.querySelector(selector);
    if (el) el.setAttribute("content", value);
  }

  // Update JSON-LD structured data
  const ldScript = document.querySelector('script[type="application/ld+json"]');
  if (ldScript) {
    try {
      const ld = JSON.parse(ldScript.textContent);
      ld.description = t("schemaDescription");
      ld.name = "CineNotes";
      if (ld.offers) ld.offers.priceCurrency = userLang === "pt-BR" ? "BRL" : "USD";
      ldScript.textContent = JSON.stringify(ld);
    } catch (_) {}
  }
}
