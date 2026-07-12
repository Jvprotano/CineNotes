<p align="center">
  <h1 align="center">🎬 CineNotes</h1>
  <p align="center">
    <strong>Rate movies together as a couple. Track, rank, and remember every film you watch.</strong>
  </p>
  <p align="center">
    <em>Avaliem filmes juntos como casal. Acompanhem, classifiquem e lembrem de cada filme assistido.</em>
  </p>
</p>

<p align="center">
  <a href="#features"><img src="https://img.shields.io/badge/status-active-success.svg" alt="Status"></a>
  <a href="#license"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="#tech-stack"><img src="https://img.shields.io/badge/deploy-Vercel-black.svg?logo=vercel" alt="Vercel"></a>
  <a href="#tech-stack"><img src="https://img.shields.io/badge/storage-Vercel%20Blob-blue.svg" alt="Vercel Blob"></a>
  <a href="#tech-stack"><img src="https://img.shields.io/badge/API-TMDB-01d277.svg?logo=themoviedatabase" alt="TMDB"></a>
</p>

---

## Table of Contents

- [About](#about)
- [Sobre (Portugues)](#sobre-portugues)
- [Features](#features)
- [How It Works](#how-it-works)
- [Recommendation Engine](#recommendation-engine)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Deployment (Vercel)](#deployment-vercel)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

---

## About

**CineNotes** is a web application designed for couples who love watching movies together. It provides a simple, elegant way to **rate movies together**, track your shared viewing history, and build a personalized movie ranking as a couple.

Whether you want to give a **joint rating** or **individual ratings** (his & hers), CineNotes keeps everything organized in a beautiful dark-themed interface. Each couple gets their own private room, protected by a password, where they can manage their movie collection.

**Keywords:** couple movie rating, rate movies together, movie tracker for couples, shared movie ratings, movie ranking app for couples.

---

## Sobre (Portugues)

**CineNotes** e um aplicativo web criado para casais que adoram assistir filmes juntos. Ele oferece uma forma simples e elegante de **avaliar filmes em casal**, acompanhar o historico de filmes assistidos e construir um ranking personalizado de filmes.

Voce pode dar uma **nota conjunta** ou **notas individuais** (dele e dela), e o CineNotes organiza tudo em uma interface escura e moderna. Cada casal tem sua propria sala privada, protegida por senha, onde podem gerenciar sua colecao de filmes.

### Principais Funcionalidades

- **Avaliacao de filmes em casal** -- nota conjunta ou notas individuais (dele e dela)
- **Ranking de filmes para casais** -- veja o ranking geral, ranking dele e ranking dela
- **Busca automatica de filmes** -- busque filmes pelo nome com cartazes via TMDB
- **Notas de filmes** -- escala de 0 a 10, com precisao de 0.5
- **Salas privadas** -- cada casal tem sua propria sala protegida por senha
- **Responsivo** -- funciona perfeitamente no celular e no desktop
- **Sem necessidade de conta** -- basta criar uma sala com codigo e senha

**Palavras-chave:** avaliacao de filmes em casal, notas de filmes, ranking de filmes para casais, avaliar filmes juntos, tracker de filmes para casais.

---

## Features

- **Couple Movie Rating** -- Rate movies with a joint score or individual ratings (his & hers)
- **Multiple Rankings** -- Overall ranking, his ranking, her ranking, and a chronological view
- **TMDB Integration** -- Search movies by name and auto-fill title, year, and poster from The Movie Database
- **Private Rooms** -- Each couple gets a password-protected room with a unique code
- **Statistics Dashboard** -- Total movies watched, average rating, and best-rated film at a glance
- **Dark Theme** -- A sleek, modern dark UI built for comfortable browsing
- **Responsive Design** -- Works beautifully on mobile, tablet, and desktop
- **No Account Required** -- Just create a room code and password to get started
- **Auto-Save** -- All changes are automatically saved to the cloud
- **Serverless Backend** -- Powered by Vercel Serverless Functions and Vercel Blob storage

---

## How It Works

1. **Create a Room** -- Choose a unique room code (e.g., `john-jane`) and set a password.
2. **Add Movies** -- Add films manually or search via TMDB to auto-fill details and posters.
3. **Rate Together** -- Give a joint couple rating or individual ratings (his score and her score, 0-10 scale with 0.5 increments).
4. **View Rankings** -- Browse four different views:
   - **Overall Ranking** -- Movies sorted by combined/average rating
   - **His Ranking** -- Movies sorted by his ratings
   - **Her Ranking** -- Movies sorted by her ratings
   - **All Movies** -- Chronological list of all entries
5. **Edit & Manage** -- Click any movie card to edit ratings, details, or delete the entry.

### Architecture (v2 — mobile-first rebuild)

The frontend was rebuilt from scratch as a mobile-first, app-like experience: bottom tab
navigation (Home / Movies / Watchlist / Stats + a center Add button), bottom sheets instead
of desktop modals, a "Tonight's pick" watchlist shuffler, live TMDB search-as-you-type,
a couple stats screen (his × her averages, couple sync, genres, decades), persistent login,
and inline SVG icons (no icon CDN). The backend API and the stored data format are unchanged
and fully compatible with rooms created by v1.

```
CineNotes/
├── index.html          # App shell: login, views, bottom nav, sheets, SVG icon sprite
├── style.css           # Design system (dark, mobile-first, safe-area aware)
├── app.js              # Client logic: state, views, sheets, sync, recommendations signals
├── i18n.js             # PT-BR / EN dictionaries + translation engine
├── api/
│   ├── create.js       # Serverless: create a new room
│   ├── load.js         # Serverless: authenticate & load room data
│   ├── save.js         # Serverless: authenticate & save room data
│   ├── search.js       # Serverless: TMDB movie search
│   ├── details.js      # Serverless: TMDB movie details + credits
│   └── recommendations.js  # Serverless: personalized recommendation pipeline
├── vercel.json         # Vercel routing configuration
└── package.json        # Dependencies (@vercel/blob)
```

Data is stored per-room as JSON files in **Vercel Blob Storage** (`salas/<room-code>.json`). Passwords are hashed with SHA-256 + salt for security.

---

## Recommendation Engine (v2 — "taste-first")

The engine was redesigned around one principle: **a movie is recommended because it
matches the couple's taste, never because it is new or currently hyped.** Trending
sources, recency boosts, and raw-popularity boosts were removed entirely.

### Signals

- **Ratings** are z-score normalized against the couple's own rating scale
  (`z = (rating − mean) / std`), so a 8.0 from a strict rater counts as much as a 9.5
  from a generous one. A mild time decay (half-life ≈ 2 years) keeps taste current.
- **Watchlist** items are a positive intent signal (fixed weight `+0.6`) and also
  generate candidates.
- **Low ratings** produce negative weights that flow into the content profile.
- **Dismissed recommendations** ("not interested") build per-genre fatigue penalties.

### Candidate generation (no trending)

- `/movie/{id}/recommendations` + `/similar` for the top 8 loved seeds
- `/movie/{id}/recommendations` for the 3 most recent watchlist items
- `/discover` by top genre (and top genre *pair*), favorite directors (`with_crew`)
  and favorite keywords (`with_keywords`) — always sorted by `vote_average.desc`
  with vote-count floors, never by popularity
- Candidates with fewer than 50 votes are dropped (kills barely-voted hype releases)

### Scoring

```text
score = 0.40 * seed_affinity      # log-dampened sum of contributions from loved seeds
      + 0.25 * content_similarity # weighted genres/keywords/directors/cast vs profile
      + 0.25 * quality            # Bayesian TMDB rating: WR = v/(v+m)·R + m/(v+m)·C
      + 0.10 * era_fit            # matches the DECADES the couple actually watches

penalties (multiplicative):
      0.7^n  per disliked genre   (and hard-dropped unless within 75% of top score)
      0.75   if similar to explicitly disliked content
      0.9    per genre dismissed 3+ times
```

The **Bayesian quality prior** (`m = 300`, `C = 6.6`) shrinks scores of low-vote
movies toward the global mean, so an acclaimed classic with 15k votes beats a
week-old release with 8.9 from 40 votes. **Era fit** replaces the old recency boost:
if the couple mostly watches 90s–2010s films, a 2026 release gets no advantage for
being new.

### Selection

- **MMR diversity re-ranking** (`λ = 0.22`) prevents genre streaks without burying
  strong matches.
- **2 "hidden gem" slots**: the highest-quality candidates *outside* the couple's
  dominant genres — quality-driven exploration instead of trending noise.
- Every result carries `basedOn` — the loved movie that generated it — shown in the
  UI as *"Because you liked X"*.

### Testing

`npm test` runs `tests/recommendations.test.js`, a mocked-TMDB harness that asserts:
personalized results, exclusion of watched movies, low-vote hype filtered out,
disliked genres dropped, recent releases a minority, and reasons present.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Vanilla HTML, CSS, JavaScript       |
| Backend    | Vercel Serverless Functions (Node.js) |
| Storage    | Vercel Blob                         |
| Movie Data | TMDB API (server-side key)          |
| Hosting    | Vercel                              |
| Font       | Outfit (Google Fonts)               |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)
- A [Vercel](https://vercel.com) account (free tier works)

### Local Development

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/CineNotes.git
   cd CineNotes
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up Vercel Blob Storage:**

   Create a Blob store in your Vercel dashboard and link it to your project. This will provide the `BLOB_READ_WRITE_TOKEN` environment variable.

   ```bash
   vercel link
   vercel env pull .env.local
   ```

4. **Run locally with Vercel CLI:**

   ```bash
   vercel dev
   ```

   The app will be available at `http://localhost:3000`.

### TMDB API (Optional)

To enable movie search with automatic poster loading:

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/).
2. Go to **Settings > API** and get your API key (v3 auth).
3. In the app, click the gear icon and paste your TMDB API key.

---

## Deployment (Vercel)

CineNotes is designed to be deployed on **Vercel** with zero configuration.

1. **Push to GitHub** (or GitLab/Bitbucket).

2. **Import in Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - Framework Preset: **Other**
   - Click **Deploy**

3. **Add Blob Storage:**
   - In your Vercel project dashboard, go to **Storage**
   - Create a new **Blob** store
   - Connect it to your project
   - The `BLOB_READ_WRITE_TOKEN` will be automatically available to your serverless functions

4. **Done!** Your app is live. Share the URL with your partner and start rating movies together.

### Environment Variables

| Variable                | Required | Description                          |
|-------------------------|----------|--------------------------------------|
| `BLOB_READ_WRITE_TOKEN` | Yes      | Provided automatically by Vercel Blob |

---

## Screenshots

> Screenshots coming soon. Here is a preview of what to expect:

| Login Screen | Movie Ranking | Add Movie |
|:---:|:---:|:---:|
| *Create or join a room* | *View your couple's movie ranking* | *Rate movies together* |

<!-- Replace with actual screenshots:
![Login](screenshots/login.png)
![Ranking](screenshots/ranking.png)
![Add Movie](screenshots/add-movie.png)
-->

---

## Contributing

Contributions are welcome! If you have ideas for new features or improvements:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/my-feature`)
3. **Commit** your changes (`git commit -m 'Add my feature'`)
4. **Push** to the branch (`git push origin feature/my-feature`)
5. **Open** a Pull Request

### Ideas for Contribution

- Multi-language support (i18n)
- Movie watchlist / "want to watch" list
- Export data as CSV or PDF
- Movie recommendation engine based on ratings
- Social sharing of rankings
- Custom avatars for each partner
- Genre-based statistics and charts

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 CineNotes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<p align="center">
  Made with ❤️ for couples who love movies.
  <br>
  <em>Feito com ❤️ para casais que amam filmes.</em>
</p>
