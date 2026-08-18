import type { DatasetModule } from "./types";

/**
 * Film database: three composite-key bridge tables (genres, cast, directors)
 * plus user reviews.
 *
 * The first lesson here is different from the other datasets. `movie_cast` has
 * `PRIMARY KEY (movie_id, actor_id)`, so filtering by `movie_id` uses that
 * index while filtering by `actor_id` cannot — the leading-column rule. The
 * column looks indexed, and isn't.
 */
const movies: DatasetModule = {
  sql: `
CREATE TABLE genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE movies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    release_year INTEGER,
    duration_minutes INTEGER,
    rating DECIMAL(3, 1),
    budget DECIMAL(15, 2),
    box_office DECIMAL(15, 2)
);

CREATE TABLE movie_genres (
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

CREATE TABLE actors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    birth_date DATE
);

CREATE TABLE movie_cast (
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    actor_id INTEGER REFERENCES actors(id) ON DELETE CASCADE,
    role_name VARCHAR(150),
    PRIMARY KEY (movie_id, actor_id)
);

CREATE TABLE directors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    birth_date DATE
);

CREATE TABLE movie_directors (
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    director_id INTEGER REFERENCES directors(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, director_id)
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(150) UNIQUE
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER REFERENCES movies(id),
    user_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 10),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO genres (id, name)
SELECT g,
  (ARRAY['Action','Adventure','Animation','Biography','Comedy','Crime','Documentary',
         'Drama','Family','Fantasy','History','Horror','Music','Mystery','Romance',
         'Sci-Fi','Thriller','War'])[g]
FROM generate_series(1, 18) AS g;

INSERT INTO movies (id, title, release_year, duration_minutes, rating, budget, box_office)
SELECT g,
  'Movie ' || g,
  1970 + (g % 56),
  75 + (g * 7) % 105,
  ((10 + (g * 31) % 90)::numeric / 10),
  ((g * 971) % 200000000 + 500000)::numeric,
  ((g * 1523) % 900000000 + 100000)::numeric
FROM generate_series(1, 3000) AS g;

-- Two genres per movie. The k offset guarantees the pair is never duplicated,
-- which a composite primary key would otherwise reject.
INSERT INTO movie_genres (movie_id, genre_id)
SELECT m, 1 + ((m * 5 + k) % 18)
FROM generate_series(1, 3000) AS m, generate_series(0, 1) AS k;

INSERT INTO actors (id, name, birth_date)
SELECT g, 'Actor ' || g, DATE '1940-01-01' + ((g * 53) % 21000)
FROM generate_series(1, 4000) AS g;

-- Six billed roles per movie, unique per (movie, actor).
INSERT INTO movie_cast (movie_id, actor_id, role_name)
SELECT m,
       1 + ((m * 13 + k * 37) % 4000),
       (ARRAY['Lead','Supporting','Cameo','Voice','Ensemble','Narrator'])[1 + k]
FROM generate_series(1, 3000) AS m, generate_series(0, 5) AS k;

INSERT INTO directors (id, name, birth_date)
SELECT g, 'Director ' || g, DATE '1935-01-01' + ((g * 97) % 20000)
FROM generate_series(1, 800) AS g;

INSERT INTO movie_directors (movie_id, director_id)
SELECT m, 1 + ((m * 7) % 800)
FROM generate_series(1, 3000) AS m;

INSERT INTO users (id, name, email)
SELECT g, 'User ' || g, 'user' || g || '@example.com'
FROM generate_series(1, 2000) AS g;

INSERT INTO reviews (id, movie_id, user_id, rating, review, created_at)
SELECT g,
  1 + (g % 3000),
  1 + (g * 3) % 2000,
  1 + (g % 10),
  'Review text ' || g,
  TIMESTAMP '2024-01-01 00:00:00' + ((g % 700) || ' days')::interval
FROM generate_series(1, 9000) AS g;
`,
  snippets: [
    {
      label: "1. Filmography by actor (slow)",
      hint: "movie_cast is keyed (movie_id, actor_id) — an index exists, but not one this query can use",
      sql: `SELECT movie_id, role_name
FROM movie_cast
WHERE actor_id = 1234;`,
    },
    {
      label: "2. Why: leading column",
      hint: "The same table, filtered on the FIRST key column — compare this plan with query 1",
      sql: `SELECT movie_id, actor_id, role_name
FROM movie_cast
WHERE movie_id = 1234;`,
    },
    {
      label: "3. Add the missing index",
      hint: "Now re-run query 1 — a composite index only helps left-to-right",
      sql: `CREATE INDEX idx_movie_cast_actor
  ON movie_cast (actor_id);

ANALYZE movie_cast;`,
    },
    {
      label: "4. Average rating by genre",
      hint: "Through the bridge table, with user reviews averaged alongside",
      sql: `SELECT g.name AS genre,
       COUNT(DISTINCT m.id)          AS movies,
       ROUND(AVG(m.rating), 2)       AS listed_rating,
       ROUND(AVG(r.rating), 2)       AS user_rating
FROM movie_genres mg
JOIN genres  g ON g.id = mg.genre_id
JOIN movies  m ON m.id = mg.movie_id
LEFT JOIN reviews r ON r.movie_id = m.id
GROUP BY g.name
ORDER BY user_rating DESC NULLS LAST;`,
    },
    {
      label: "5. Worked with a director",
      hint: "Two bridge tables meeting on movie_id — the classic collaboration query",
      sql: `SELECT a.name AS actor, COUNT(*) AS films_together
FROM movie_directors md
JOIN movie_cast mc ON mc.movie_id = md.movie_id
JOIN actors     a  ON a.id = mc.actor_id
WHERE md.director_id = 42
GROUP BY a.id, a.name
ORDER BY films_together DESC, a.name
LIMIT 25;`,
    },
    {
      label: "6. Most profitable films",
      hint: "Arithmetic in ORDER BY, with the genre list collapsed per row",
      sql: `SELECT m.title, m.release_year,
       m.box_office - m.budget                AS profit,
       ROUND(m.box_office / NULLIF(m.budget, 0), 2) AS multiple,
       STRING_AGG(g.name, ', ' ORDER BY g.name)     AS genres
FROM movies m
JOIN movie_genres mg ON mg.movie_id = m.id
JOIN genres       g  ON g.id = mg.genre_id
GROUP BY m.id, m.title, m.release_year, m.box_office, m.budget
ORDER BY profit DESC
LIMIT 20;`,
    },
  ],
};

export default movies;
