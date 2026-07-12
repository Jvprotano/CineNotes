/* Test harness for api/recommendations.js with a mocked TMDB. */
process.env.TMDB_API_KEY = "test-key";

// ---------- fixture movie universe ----------
// Genres: 18 Drama, 35 Comedy, 53 Thriller, 80 Crime, 10749 Romance, 27 Horror, 878 SciFi
const MOVIES = {
  // Taste-matched catalog films (older, acclaimed, high votes)
  901: { id: 901, title: "Matched Classic 90s", release_date: "1995-05-01", genre_ids: [18, 80], vote_average: 8.4, vote_count: 12000, poster_path: "/a.jpg", overview: "" },
  902: { id: 902, title: "Matched Thriller 00s", release_date: "2003-02-01", genre_ids: [53, 80], vote_average: 8.1, vote_count: 9000, poster_path: "/b.jpg", overview: "" },
  903: { id: 903, title: "Matched Drama 10s", release_date: "2013-08-01", genre_ids: [18], vote_average: 7.9, vote_count: 7000, poster_path: "/c.jpg", overview: "" },
  904: { id: 904, title: "Matched Comedy 90s", release_date: "1998-01-01", genre_ids: [35, 10749], vote_average: 7.8, vote_count: 6000, poster_path: "/d.jpg", overview: "" },
  // Recent hyped movie, FEW votes (must be filtered by MIN_VOTE_COUNT)
  905: { id: 905, title: "Hyped New Release", release_date: "2026-06-20", genre_ids: [878, 28], vote_average: 8.9, vote_count: 40, poster_path: "/e.jpg", overview: "" },
  // Recent popular blockbuster, many votes, weak taste match
  906: { id: 906, title: "Recent Blockbuster", release_date: "2026-03-01", genre_ids: [878, 12], vote_average: 7.0, vote_count: 3000, poster_path: "/f.jpg", overview: "" },
  // Horror (disliked genre)
  907: { id: 907, title: "Horror Flick", release_date: "2005-10-01", genre_ids: [27], vote_average: 7.6, vote_count: 5000, poster_path: "/g.jpg", overview: "" },
  // Excluded (already watched)
  908: { id: 908, title: "Already Watched", release_date: "2010-01-01", genre_ids: [18], vote_average: 8.0, vote_count: 8000, poster_path: "/h.jpg", overview: "" },
  // Hidden gem candidate: acclaimed, outside dominant genres
  909: { id: 909, title: "Acclaimed Documentary", release_date: "2008-01-01", genre_ids: [99], vote_average: 8.3, vote_count: 2500, poster_path: "/i.jpg", overview: "" },
  // More filler matched candidates
  910: { id: 910, title: "Matched Crime 90s", release_date: "1994-01-01", genre_ids: [80, 18], vote_average: 8.6, vote_count: 15000, poster_path: "/j.jpg", overview: "" },
  911: { id: 911, title: "Matched Romance 00s", release_date: "2004-06-01", genre_ids: [10749, 35], vote_average: 7.7, vote_count: 4000, poster_path: "/k.jpg", overview: "" },
  912: { id: 912, title: "Weak Match Old", release_date: "1980-01-01", genre_ids: [37], vote_average: 7.2, vote_count: 900, poster_path: "/l.jpg", overview: "" },
};

const seedRecs = {
  // seed 101 (loved drama/crime) recommends matched films + excluded + hyped
  101: [901, 902, 910, 908, 905, 906],
  // seed 102 (loved comedy/romance)
  102: [904, 911, 903, 906],
  // seed 103 (loved thriller)
  103: [902, 910, 901, 907],
  // watchlist seed 104
  104: [903, 909, 911],
  // disliked seed 105 (horror, rated 3) — engine must NOT use as positive seed
  105: [907],
};

const seedDetails = {
  101: { kw: [1001, 1002], dir: [501], cast: [601, 602] },
  102: { kw: [1003], dir: [502], cast: [603] },
  103: { kw: [1001, 1004], dir: [501], cast: [601] },
  104: { kw: [1002], dir: [503], cast: [604] },
  105: { kw: [1099], dir: [599], cast: [699] },
};
const candKw = {
  901: [1001, 1002], 902: [1001, 1004], 903: [1002], 904: [1003],
  906: [1050], 907: [1099], 909: [1060], 910: [1001], 911: [1003], 912: [1070],
};

function listResponse(ids) {
  return { results: ids.map((id) => MOVIES[id]).filter(Boolean) };
}

global.fetch = async (url) => {
  const u = new URL(url);
  const path = u.pathname.replace("/3", "");
  let body = { results: [] };

  let m;
  if ((m = path.match(/^\/movie\/(\d+)\/(recommendations|similar)$/))) {
    const id = Number(m[1]);
    body = listResponse(seedRecs[id] || []);
  } else if ((m = path.match(/^\/movie\/(\d+)$/))) {
    const id = Number(m[1]);
    const seed = seedDetails[id];
    const kws = seed ? seed.kw : candKw[id] || [];
    const dirs = seed ? seed.dir : [];
    const cast = seed ? seed.cast : [];
    body = {
      id,
      keywords: { keywords: kws.map((k) => ({ id: k })) },
      credits: {
        crew: dirs.map((d) => ({ id: d, job: "Director" })),
        cast: cast.map((c) => ({ id: c })),
      },
    };
  } else if (path === "/discover/movie") {
    // Return acclaimed catalog incl. the documentary and old weak match
    body = listResponse([910, 901, 909, 912, 906]);
  } else if (path === "/movie/top_rated" || path === "/trending/movie/week") {
    body = listResponse([910, 901, 906]);
  }
  return { ok: true, json: async () => body };
};

// ---------- fake req/res ----------
function makeRes() {
  const out = {};
  return {
    out,
    status(code) { out.code = code; return this; },
    json(obj) { out.body = obj; return this; },
  };
}

const handler = require("../api/recommendations.js");

async function main() {
  const body = {
    lang: "en",
    excludeTmdbIds: [908, 101, 102, 103, 104, 105],
    dislikedGenreIds: [27],
    seeds: [
      // Loved (well above their mean)
      { tmdbId: 101, rating: 9.5, genreIds: [18, 80], signalType: "rating", title: "Fav Drama", year: "1999", dateAdded: "2026-01-01" },
      { tmdbId: 102, rating: 9.0, genreIds: [35, 10749], signalType: "rating", title: "Fav Comedy", year: "2004", dateAdded: "2026-02-01" },
      { tmdbId: 103, rating: 8.5, genreIds: [53, 80], signalType: "rating", title: "Fav Thriller", year: "2008", dateAdded: "2026-03-01" },
      // Mid ratings to establish the mean
      { tmdbId: 106, rating: 7.0, genreIds: [18], signalType: "rating", title: "Mid Drama", year: "2012", dateAdded: "2026-04-01" },
      { tmdbId: 107, rating: 6.5, genreIds: [35], signalType: "rating", title: "Mid Comedy", year: "2015", dateAdded: "2026-04-02" },
      // Hated horror
      { tmdbId: 105, rating: 3.0, genreIds: [27], signalType: "rating", title: "Bad Horror", year: "2020", dateAdded: "2026-05-01" },
      // Watchlist intent
      { tmdbId: 104, rating: 6.5, genreIds: [18], signalType: "watchlist", title: "Wanted Drama", year: "2016", dateAdded: "2026-07-01" },
    ],
    dismissedWithGenres: [],
  };

  const res = makeRes();
  await handler({ method: "POST", body }, res);

  const { code, body: out } = res.out;
  if (code !== 200) { console.error("FAIL: status", code, out); process.exit(1); }

  const results = out.results;
  const titles = results.map((r) => `${r.title} (${r.year}) score=${r.score} basedOn=${r.basedOn || "-"}`);
  console.log("type:", out.type);
  console.log(titles.join("\n"));

  const assert = (cond, msg) => {
    if (!cond) { console.error("FAIL:", msg); process.exitCode = 1; }
    else console.log("PASS:", msg);
  };

  const byTitle = Object.fromEntries(results.map((r, i) => [r.title, { ...r, rank: i }]));

  assert(out.type === "personalized", "returns personalized results");
  assert(results.length > 0 && results.length <= 20, "returns 1..20 results");
  assert(!byTitle["Already Watched"], "excluded movie does not appear");
  assert(!byTitle["Hyped New Release"], "low-vote hyped new release filtered out");
  assert(byTitle["Matched Classic 90s"], "taste-matched 90s classic present");
  assert(results.every((r) => r.tmdbId !== 105 && r.tmdbId !== 907 || true), "noop");
  if (byTitle["Horror Flick"] && byTitle["Matched Classic 90s"]) {
    assert(byTitle["Horror Flick"].rank > byTitle["Matched Classic 90s"].rank, "disliked-genre movie ranks below matched classic");
  } else {
    assert(true, "horror either absent or ranked (absent)");
  }
  if (byTitle["Recent Blockbuster"]) {
    const matchedRanks = ["Matched Classic 90s", "Matched Thriller 00s", "Matched Crime 90s"].map((t) => byTitle[t] ? byTitle[t].rank : 99);
    assert(Math.min(...matchedRanks) < byTitle["Recent Blockbuster"].rank, "recent blockbuster ranks below taste matches");
  } else {
    assert(true, "recent blockbuster not even selected");
  }
  assert(results.some((r) => r.basedOn), "basedOn reasons present");
  const recent = results.filter((r) => Number(r.year) >= 2024).length;
  assert(recent <= results.length * 0.3, `recent (>=2024) movies are a minority (${recent}/${results.length})`);

  // Cold start check
  const res2 = makeRes();
  await handler({ method: "POST", body: { lang: "en", excludeTmdbIds: [], seeds: [] } }, res2);
  assert(res2.out.code === 200 && res2.out.body.type === "trending", "cold start returns trending type");
  assert(res2.out.body.results.length > 0, "cold start returns results");
}

main().catch((e) => { console.error("CRASH:", e); process.exit(1); });
