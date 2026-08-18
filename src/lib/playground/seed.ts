/**
 * Demo dataset — a golf reservation schema, sized so that index choices
 * actually change the query plan.
 *
 * Deliberately under-indexed: only primary keys exist. `tee_time`, `status`
 * and the foreign-key columns are left bare so a first query sequential-scans
 * 120k rows, and the user can watch the plan flip after CREATE INDEX.
 */
export const SEED_SQL = `
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS courses;

CREATE TABLE courses (
  id          integer PRIMARY KEY,
  name        text    NOT NULL,
  prefecture  text    NOT NULL,
  holes       smallint NOT NULL,
  green_fee   integer NOT NULL
);

CREATE TABLE players (
  id          integer PRIMARY KEY,
  full_name   text    NOT NULL,
  email       text    NOT NULL,
  handicap    numeric(4,1),
  joined_at   date    NOT NULL
);

CREATE TABLE reservations (
  id            integer   PRIMARY KEY,
  course_id     integer   NOT NULL REFERENCES courses(id),
  player_id     integer   NOT NULL REFERENCES players(id),
  tee_time      timestamp NOT NULL,
  players_count smallint  NOT NULL,
  status        text      NOT NULL,
  total_fee     integer   NOT NULL,
  created_at    timestamp NOT NULL
);

INSERT INTO courses (id, name, prefecture, holes, green_fee)
SELECT
  g,
  'Golf Club ' || g,
  (ARRAY['Tokyo','Osaka','Hokkaido','Fukuoka','Aichi','Hyogo','Chiba','Nagano'])[1 + (g % 8)],
  CASE WHEN g % 6 = 0 THEN 9 ELSE 18 END,
  6000 + (g * 137) % 18000
FROM generate_series(1, 450) AS g;

INSERT INTO players (id, full_name, email, handicap, joined_at)
SELECT
  g,
  'Player ' || g,
  'player' || g || '@example.com',
  ROUND((g % 360) / 10.0, 1),
  DATE '2019-01-01' + ((g * 7) % 2200)
FROM generate_series(1, 20000) AS g;

INSERT INTO reservations (id, course_id, player_id, tee_time, players_count, status, total_fee, created_at)
SELECT
  g,
  1 + (g * 7) % 450,
  1 + (g * 13) % 20000,
  TIMESTAMP '2026-01-01 06:00:00'
    + ((g % 365) || ' days')::interval
    + (((g % 24) * 15) || ' minutes')::interval,
  1 + (g % 4),
  (ARRAY['confirmed','confirmed','confirmed','confirmed','cancelled','completed'])[1 + (g % 6)],
  6000 + (g * 91) % 22000,
  TIMESTAMP '2025-12-01 09:00:00' + ((g % 120) || ' days')::interval
FROM generate_series(1, 120000) AS g;

ANALYZE;
`;

export type Snippet = {
  label: string;
  hint: string;
  sql: string;
};

/**
 * Ordered as a lesson: scan the slow way, index it, watch the plan change.
 */
export const SNIPPETS: Snippet[] = [
  {
    label: "1. Range scan (slow)",
    hint: "120k rows, no index on tee_time — expect a Seq Scan",
    sql: `SELECT id, course_id, tee_time, status
FROM reservations
WHERE tee_time BETWEEN '2026-03-01' AND '2026-03-07'
ORDER BY tee_time
LIMIT 50;`,
  },
  {
    label: "2. Add the index",
    hint: "Then re-run query 1 and compare the plan",
    sql: `CREATE INDEX idx_reservations_tee_time
  ON reservations (tee_time);

ANALYZE reservations;`,
  },
  {
    label: "3. Join without an index",
    hint: "reservations.course_id has no index — watch the join strategy",
    sql: `SELECT c.name, c.prefecture, COUNT(*) AS bookings
FROM reservations r
JOIN courses c ON c.id = r.course_id
WHERE r.status = 'confirmed'
GROUP BY c.name, c.prefecture
ORDER BY bookings DESC
LIMIT 20;`,
  },
  {
    label: "4. Row-estimate trap",
    hint: "The planner mis-estimates correlated filters — check est. vs actual",
    sql: `SELECT *
FROM reservations
WHERE status = 'cancelled'
  AND players_count = 4
  AND total_fee > 20000;`,
  },
  {
    label: "5. Sort that spills",
    hint: "Sorting 120k rows — look for external merge vs quicksort",
    sql: `SELECT player_id, tee_time, total_fee
FROM reservations
ORDER BY total_fee DESC, tee_time
LIMIT 100;`,
  },
];
