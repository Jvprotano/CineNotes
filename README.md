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

### Architecture

```
CineNotes/
├── index.html          # Single-page application (frontend)
├── style.css           # Dark-themed responsive styles
├── app.js              # Client-side application logic
├── api/
│   ├── create.js       # Serverless function: create a new room
│   ├── load.js         # Serverless function: authenticate & load room data
│   └── save.js         # Serverless function: authenticate & save room data
├── vercel.json         # Vercel routing configuration
└── package.json        # Dependencies (@vercel/blob)
```

Data is stored per-room as JSON files in **Vercel Blob Storage** (`salas/<room-code>.json`). Passwords are hashed with SHA-256 + salt for security.

---

## Recommendation Engine

The recommendation system now uses a multi-stage ranking pipeline instead of relying only on TMDB's `/recommendations` endpoint.

### Strategy Overview

1. **Collect user signals**  
   The existing `seeds` request field now carries all rated movies plus watchlist items. Rated movies keep their real score. Watchlist items are treated as a strong positive intent signal with a synthetic rating of `7.5`.

2. **Build a user profile**  
   Every rating is normalized with:

   ```text
   weight = rating - user_mean_rating
   ```

   Positive weights represent preference. Negative weights represent avoidance. Watchlist items receive an additional positive boost so they influence both genre preference and candidate generation.

3. **Fetch candidates from multiple TMDB sources**  
   For the strongest positive seeds, the backend fetches:

   - `/movie/{id}/recommendations`
   - `/movie/{id}/similar`

   It also fetches:

   - `/discover/movie` using the user's strongest genres
   - `/trending/movie/week` for exploration

   Calls are executed in parallel and intentionally capped to one page per endpoint to keep latency under control.

4. **Merge, score, explore, and rerank**  
   Results are deduplicated by TMDB ID, scored with user-profile similarity plus TMDB metadata, then reranked to reserve exploration slots and avoid repetitive genre streaks.

### Scoring Formula

Each candidate receives a final ranking score based on:

```text
score =
  w1 * weighted_similarity +
  w2 * frequency +
  w3 * tmdb_vote_average +
  w4 * popularity +
  w5 * recency
```

Where:

- `weighted_similarity` comes from genre overlap with weighted user signals
- `frequency` counts how often a movie appears across recommendation sources
- `tmdb_vote_average` is normalized to 0-1
- `popularity` is log-normalized to reduce blockbuster dominance
- `recency` gives a modest boost to newer releases

Genre similarity is computed with the Jaccard index:

```text
genre_similarity = intersection(genres) / union(genres)
```

Disliked genres keep the existing multiplicative penalty:

```text
score *= 0.7 ^ disliked_genre_matches
```

### Data Flow

```text
movies + watchlist
        |
        v
buildRecommendationSignals() on the client
        |
        v
/api/recommendations
        |
        v
getUserData()
        |
        v
buildUserProfile()
        |
        v
fetchCandidates()
        |
        v
mergeAndDeduplicate()
        |
        v
computeScores()
        |
        v
applyExploration()
        |
        v
rerankWithDiversity()
        |
        v
returnTopResults()
```

### Trade-offs vs Previous Approach

Previous approach:

- Used only highly rated seed movies
- Relied almost entirely on TMDB `/recommendations`
- Ranked by seed-rating sum plus raw frequency
- Ignored watchlist intent

Current approach:

- Uses all ratings, not only favorites
- Uses watchlist as a first-class signal
- Combines recommendations, similar titles, discover, and trending
- Penalizes negative taste signals instead of only boosting favorites
- Explicitly balances personalization, diversity, and exploration

Trade-offs:

- The backend logic is more complex than the previous rule-based ranker
- It makes more TMDB calls, but calls are bounded and parallelized
- Genre-based similarity is still heuristic and less expressive than embeddings

### Future Improvements

- Synopsis or multimodal embeddings for richer similarity
- Vector search over a local movie index instead of TMDB-only retrieval
- Online learning from clicks, skips, and watchlist additions
- Separate pair-level and individual taste models
- Caching TMDB metadata to reduce repeated network calls

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Vanilla HTML, CSS, JavaScript       |
| Backend    | Vercel Serverless Functions (Node.js) |
| Storage    | Vercel Blob                         |
| Movie Data | TMDB API (optional)                 |
| Hosting    | Vercel                              |
| Font       | Inter (Google Fonts)                |

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
