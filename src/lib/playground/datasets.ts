/**
 * Practice datasets.
 *
 * Every dataset is deliberately under-indexed — only primary keys exist — so
 * that a first query sequential-scans a large table and the plan visibly
 * changes once the right index is added. Row counts are chosen to be big
 * enough that the planner's choices actually matter, and small enough to seed
 * in a couple of seconds.
 *
 * Data is generated with modulo arithmetic over `generate_series` rather than
 * random(), so every visitor gets identical rows and identical plans.
 */

export type Snippet = {
  label: string;
  hint: string;
  sql: string;
};

export type Dataset = {
  id: string;
  name: string;
  tagline: string;
  /** Approximate seeded size, shown in the picker. */
  size: string;
  /** DDL plus inserts. The loader drops the schema first, so no DROP needed. */
  sql: string;
  snippets: Snippet[];
};

const golf: Dataset = {
  id: "golf",
  name: "Golf ticket reservations",
  tagline:
    "Ticket types, issued tickets, redemptions and payments across 450 courses.",
  size: "≈260k rows",
  sql: `
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

CREATE TABLE ticket_types (
  id           integer PRIMARY KEY,
  name         text    NOT NULL,
  price_cents  integer NOT NULL,
  holes        smallint NOT NULL,
  transferable boolean NOT NULL
);

-- A ticket is issued to a player for a course, then redeemed by a reservation.
CREATE TABLE tickets (
  id             integer PRIMARY KEY,
  ticket_type_id integer NOT NULL REFERENCES ticket_types(id),
  course_id      integer NOT NULL REFERENCES courses(id),
  player_id      integer NOT NULL REFERENCES players(id),
  code           text    NOT NULL,
  issued_at      timestamp NOT NULL,
  valid_until    date    NOT NULL,
  status         text    NOT NULL
);

CREATE TABLE reservations (
  id            integer   PRIMARY KEY,
  ticket_id     integer   REFERENCES tickets(id),
  course_id     integer   NOT NULL REFERENCES courses(id),
  player_id     integer   NOT NULL REFERENCES players(id),
  tee_time      timestamp NOT NULL,
  players_count smallint  NOT NULL,
  status        text      NOT NULL,
  total_fee     integer   NOT NULL,
  created_at    timestamp NOT NULL
);

CREATE TABLE payments (
  id             integer PRIMARY KEY,
  reservation_id integer NOT NULL REFERENCES reservations(id),
  amount_cents   integer NOT NULL,
  method         text    NOT NULL,
  status         text    NOT NULL,
  paid_at        timestamp NOT NULL
);

INSERT INTO courses (id, name, prefecture, holes, green_fee)
SELECT g, 'Golf Club ' || g,
  (ARRAY['Tokyo','Osaka','Hokkaido','Fukuoka','Aichi','Hyogo','Chiba','Nagano'])[1 + (g % 8)],
  CASE WHEN g % 6 = 0 THEN 9 ELSE 18 END,
  6000 + (g * 137) % 18000
FROM generate_series(1, 450) AS g;

INSERT INTO players (id, full_name, email, handicap, joined_at)
SELECT g, 'Player ' || g, 'player' || g || '@example.com',
  ROUND((g % 360) / 10.0, 1),
  DATE '2019-01-01' + ((g * 7) % 2200)
FROM generate_series(1, 20000) AS g;

INSERT INTO ticket_types (id, name, price_cents, holes, transferable) VALUES
  (1, 'Free trial',        0,     9,  false),
  (2, 'Weekday 18',        780000, 18, true),
  (3, 'Weekend 18',        1250000, 18, true),
  (4, 'Twilight 9',        420000, 9,  true),
  (5, 'Member guest',      560000, 18, false),
  (6, 'Corporate outing',  980000, 18, true);

INSERT INTO tickets (id, ticket_type_id, course_id, player_id, code, issued_at, valid_until, status)
SELECT g,
  1 + (g % 6),
  1 + (g * 7) % 450,
  1 + (g * 13) % 20000,
  'TKT-' || LPAD(g::text, 8, '0'),
  TIMESTAMP '2025-10-01 00:00:00' + ((g % 300) || ' days')::interval,
  DATE '2026-06-30' + ((g % 90)),
  (ARRAY['issued','redeemed','redeemed','expired','cancelled'])[1 + (g % 5)]
FROM generate_series(1, 60000) AS g;

-- Half the reservations redeem a ticket; the rest are paid at the counter,
-- which leaves ticket_id NULL and makes LEFT JOIN the correct tool.
INSERT INTO reservations (id, ticket_id, course_id, player_id, tee_time, players_count, status, total_fee, created_at)
SELECT g,
  CASE WHEN g % 2 = 0 THEN 1 + (g / 2) % 60000 ELSE NULL END,
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

INSERT INTO payments (id, reservation_id, amount_cents, method, status, paid_at)
SELECT g, g,
  600000 + (g * 91) % 2200000,
  (ARRAY['credit_card','credit_card','konbini','bank_transfer','paypay'])[1 + (g % 5)],
  (ARRAY['captured','captured','captured','captured','refunded','failed'])[1 + (g % 6)],
  TIMESTAMP '2025-12-01 10:00:00' + ((g % 120) || ' days')::interval
FROM generate_series(1, 60000) AS g;
`,
  snippets: [
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
      label: "3. Redemption rate by ticket type",
      hint: "Aggregate over 60k tickets grouped through a small lookup table",
      sql: `SELECT tt.name,
       COUNT(*)                                              AS issued,
       COUNT(*) FILTER (WHERE t.status = 'redeemed')          AS redeemed,
       ROUND(100.0 * COUNT(*) FILTER (WHERE t.status = 'redeemed')
             / COUNT(*), 1)                                   AS pct
FROM tickets t
JOIN ticket_types tt ON tt.id = t.ticket_type_id
GROUP BY tt.name
ORDER BY pct DESC;`,
    },
    {
      label: "4. Counter sales (LEFT JOIN)",
      hint: "Slow on purpose — the FK column already answers this. Compare with WHERE r.ticket_id IS NULL",
      sql: `SELECT c.name, COUNT(*) AS walk_in_bookings
FROM reservations r
LEFT JOIN tickets t ON t.id = r.ticket_id
JOIN courses c      ON c.id = r.course_id
WHERE t.id IS NULL
  AND r.status = 'confirmed'
GROUP BY c.name
ORDER BY walk_in_bookings DESC
LIMIT 20;`,
    },
    {
      label: "5. Unpaid confirmed bookings",
      hint: "Reservations with no captured payment — three tables, one NOT EXISTS",
      sql: `SELECT r.id, r.tee_time, r.total_fee
FROM reservations r
WHERE r.status = 'confirmed'
  AND NOT EXISTS (
    SELECT 1 FROM payments p
    WHERE p.reservation_id = r.id AND p.status = 'captured'
  )
ORDER BY r.tee_time
LIMIT 50;`,
    },
    {
      label: "6. Row-estimate trap",
      hint: "The planner mis-estimates correlated filters — check est. vs actual",
      sql: `SELECT *
FROM reservations
WHERE status = 'cancelled'
  AND players_count = 4
  AND total_fee > 20000;`,
    },
  ],
};

const ecommerce: Dataset = {
  id: "ecommerce",
  name: "E-commerce orders",
  tagline:
    "Categories, products, orders, line items and shipments — multi-table joins.",
  size: "≈201k rows",
  sql: `
CREATE TABLE categories (
  id        integer PRIMARY KEY,
  name      text NOT NULL,
  parent_id integer REFERENCES categories(id)
);

CREATE TABLE customers (
  id           integer PRIMARY KEY,
  full_name    text NOT NULL,
  email        text NOT NULL,
  country      text NOT NULL,
  signed_up_at date NOT NULL
);

CREATE TABLE products (
  id          integer PRIMARY KEY,
  category_id integer NOT NULL REFERENCES categories(id),
  sku         text NOT NULL,
  name        text NOT NULL,
  price_cents integer NOT NULL,
  stock       integer NOT NULL
);

CREATE TABLE orders (
  id          integer PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id),
  placed_at   timestamp NOT NULL,
  status      text NOT NULL,
  total_cents integer NOT NULL
);

CREATE TABLE order_items (
  id               integer PRIMARY KEY,
  order_id         integer NOT NULL REFERENCES orders(id),
  product_id       integer NOT NULL REFERENCES products(id),
  quantity         smallint NOT NULL,
  unit_price_cents integer NOT NULL
);

CREATE TABLE shipments (
  id           integer PRIMARY KEY,
  order_id     integer NOT NULL REFERENCES orders(id),
  carrier      text NOT NULL,
  shipped_at   timestamp NOT NULL,
  delivered_at timestamp,
  status       text NOT NULL
);

INSERT INTO categories (id, name, parent_id) VALUES
  (1, 'Electronics', NULL), (2, 'Kitchen', NULL), (3, 'Outdoor', NULL),
  (4, 'Books', NULL),       (5, 'Apparel', NULL), (6, 'Toys', NULL),
  (7, 'Laptops', 1),        (8, 'Phones', 1),     (9, 'Cookware', 2),
  (10, 'Camping', 3),       (11, 'Fiction', 4),   (12, 'Footwear', 5);

INSERT INTO customers (id, full_name, email, country, signed_up_at)
SELECT g, 'Customer ' || g, 'customer' || g || '@example.com',
  (ARRAY['BD','JP','US','GB','DE','IN','SG','AU'])[1 + (g % 8)],
  DATE '2021-01-01' + ((g * 11) % 1500)
FROM generate_series(1, 10000) AS g;

INSERT INTO products (id, category_id, sku, name, price_cents, stock)
SELECT g,
  1 + (g % 12),
  'SKU-' || LPAD(g::text, 6, '0'),
  'Product ' || g,
  500 + (g * 173) % 49500,
  CASE WHEN g % 17 = 0 THEN 0 ELSE (g * 7) % 400 END
FROM generate_series(1, 1000) AS g;

INSERT INTO orders (id, customer_id, placed_at, status, total_cents)
SELECT g,
  1 + (g * 3) % 10000,
  TIMESTAMP '2025-01-01 00:00:00' + ((g % 400) || ' days')::interval
    + ((g % 1440) || ' minutes')::interval,
  (ARRAY['paid','paid','paid','shipped','delivered','refunded'])[1 + (g % 6)],
  1500 + (g * 271) % 98500
FROM generate_series(1, 40000) AS g;

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_cents)
SELECT g,
  1 + (g % 40000),
  1 + (g * 7) % 1000,
  1 + (g % 5),
  500 + (g * 173) % 49500
FROM generate_series(1, 120000) AS g;

-- Roughly a quarter of shipments are still in transit (delivered_at IS NULL).
INSERT INTO shipments (id, order_id, carrier, shipped_at, delivered_at, status)
SELECT g, g,
  (ARRAY['dhl','fedex','ups','local-post'])[1 + (g % 4)],
  TIMESTAMP '2025-01-02 00:00:00' + ((g % 400) || ' days')::interval,
  CASE WHEN g % 4 = 0 THEN NULL
       ELSE TIMESTAMP '2025-01-02 00:00:00' + ((g % 400) || ' days')::interval
            + (((g % 9) + 1) || ' days')::interval END,
  CASE WHEN g % 4 = 0 THEN 'in_transit' ELSE 'delivered' END
FROM generate_series(1, 30000) AS g;
`,
  snippets: [
    {
      label: "1. Line items for one order",
      hint: "order_items.order_id has no index — a Seq Scan over 120k rows to find ~3",
      sql: `SELECT id, product_id, quantity, unit_price_cents
FROM order_items
WHERE order_id = 12345;`,
    },
    {
      label: "2. Add the index",
      hint: "Re-run query 1 — Seq Scan should become an Index Scan",
      sql: `CREATE INDEX idx_order_items_order_id
  ON order_items (order_id);

ANALYZE order_items;`,
    },
    {
      label: "3. Revenue by category",
      hint: "Three joins and an aggregate over 120k line items",
      sql: `SELECT cat.name AS category,
       COUNT(DISTINCT o.id)                        AS orders,
       SUM(oi.quantity * oi.unit_price_cents)/100  AS revenue
FROM order_items oi
JOIN orders     o   ON o.id = oi.order_id
JOIN products   p   ON p.id = oi.product_id
JOIN categories cat ON cat.id = p.category_id
WHERE o.status <> 'refunded'
GROUP BY cat.name
ORDER BY revenue DESC;`,
    },
    {
      label: "4. Category tree (self-join)",
      hint: "categories.parent_id points back into the same table",
      sql: `SELECT child.name AS subcategory,
       parent.name AS parent,
       COUNT(p.id) AS products
FROM categories child
JOIN categories parent ON parent.id = child.parent_id
LEFT JOIN products p   ON p.category_id = child.id
GROUP BY child.name, parent.name
ORDER BY parent, subcategory;`,
    },
    {
      label: "5. Delivery lag by carrier",
      hint: "Date arithmetic plus a NULL filter for parcels still in transit",
      sql: `SELECT carrier,
       COUNT(*)                                          AS delivered,
       ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - shipped_at))
                 / 86400)::numeric, 2)                    AS avg_days
FROM shipments
WHERE delivered_at IS NOT NULL
GROUP BY carrier
ORDER BY avg_days;`,
    },
    {
      label: "6. Never ordered (anti-join)",
      hint: "NOT EXISTS vs LEFT JOIN ... IS NULL — check both plans",
      sql: `SELECT p.id, p.name, c.name AS category
FROM products p
JOIN categories c ON c.id = p.category_id
WHERE NOT EXISTS (
  SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
)
ORDER BY p.id;`,
    },
  ],
};

const banking: Dataset = {
  id: "banking",
  name: "Banking transactions",
  tagline:
    "Customers, accounts, 150k ledger entries and transfers — window functions.",
  size: "≈204k rows",
  sql: `
CREATE TABLE branches (
  id   integer PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL
);

CREATE TABLE customers (
  id        integer PRIMARY KEY,
  full_name text NOT NULL,
  email     text NOT NULL,
  kyc_level smallint NOT NULL,
  joined_at date NOT NULL
);

CREATE TABLE accounts (
  id            integer PRIMARY KEY,
  branch_id     integer NOT NULL REFERENCES branches(id),
  customer_id   integer NOT NULL REFERENCES customers(id),
  kind          text NOT NULL,
  opened_at     date NOT NULL,
  balance_cents bigint NOT NULL
);

CREATE TABLE transactions (
  id           integer PRIMARY KEY,
  account_id   integer NOT NULL REFERENCES accounts(id),
  occurred_at  timestamp NOT NULL,
  amount_cents integer NOT NULL,
  kind         text NOT NULL,
  description  text NOT NULL
);

-- Two foreign keys into the same table: joining both sides is the lesson.
CREATE TABLE transfers (
  id              integer PRIMARY KEY,
  from_account_id integer NOT NULL REFERENCES accounts(id),
  to_account_id   integer NOT NULL REFERENCES accounts(id),
  amount_cents    integer NOT NULL,
  status          text NOT NULL,
  occurred_at     timestamp NOT NULL
);

INSERT INTO branches (id, name, city)
SELECT g, 'Branch ' || g,
  (ARRAY['Dhaka','Chattogram','Sylhet','Khulna','Rajshahi','Barishal'])[1 + (g % 6)]
FROM generate_series(1, 40) AS g;

INSERT INTO customers (id, full_name, email, kyc_level, joined_at)
SELECT g, 'Holder ' || g, 'holder' || g || '@example.com',
  1 + (g % 3),
  DATE '2017-01-01' + ((g * 17) % 3000)
FROM generate_series(1, 6000) AS g;

-- 8k accounts over 6k customers, so some customers hold more than one.
INSERT INTO accounts (id, branch_id, customer_id, kind, opened_at, balance_cents)
SELECT g,
  1 + (g % 40),
  1 + (g % 6000),
  (ARRAY['current','savings','savings','fixed'])[1 + (g % 4)],
  DATE '2018-01-01' + ((g * 13) % 2900),
  ((g * 977) % 5000000)::bigint
FROM generate_series(1, 8000) AS g;

INSERT INTO transactions (id, account_id, occurred_at, amount_cents, kind, description)
SELECT g,
  1 + (g * 11) % 8000,
  TIMESTAMP '2025-01-01 00:00:00' + ((g % 500) || ' days')::interval
    + ((g % 1440) || ' minutes')::interval,
  CASE WHEN g % 3 = 0 THEN -((g * 79) % 90000 + 100)
       ELSE ((g * 53) % 120000 + 100) END,
  (ARRAY['deposit','withdrawal','transfer','fee','interest'])[1 + (g % 5)],
  'Txn reference ' || g
FROM generate_series(1, 150000) AS g;

-- The offset guarantees from_account_id <> to_account_id for every row.
INSERT INTO transfers (id, from_account_id, to_account_id, amount_cents, status, occurred_at)
SELECT g,
  1 + (g * 7) % 8000,
  1 + ((g * 7) + 1 + (g % 7919)) % 8000,
  ((g * 131) % 400000 + 500),
  (ARRAY['settled','settled','settled','pending','failed'])[1 + (g % 5)],
  TIMESTAMP '2025-01-01 00:00:00' + ((g % 500) || ' days')::interval
FROM generate_series(1, 40000) AS g;
`,
  snippets: [
    {
      label: "1. Statement for one account",
      hint: "transactions.account_id has no index — 150k rows scanned for ~19",
      sql: `SELECT occurred_at, kind, amount_cents, description
FROM transactions
WHERE account_id = 4242
ORDER BY occurred_at DESC
LIMIT 50;`,
    },
    {
      label: "2. Add the index",
      hint: "A composite index also serves the ORDER BY — try both",
      sql: `CREATE INDEX idx_transactions_account_time
  ON transactions (account_id, occurred_at DESC);

ANALYZE transactions;`,
    },
    {
      label: "3. Running balance",
      hint: "A window function over one account's ledger",
      sql: `SELECT occurred_at,
       amount_cents,
       SUM(amount_cents) OVER (
         ORDER BY occurred_at, id
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_balance
FROM transactions
WHERE account_id = 4242
ORDER BY occurred_at
LIMIT 100;`,
    },
    {
      label: "4. Transfers both ways",
      hint: "Joining accounts twice — one alias per side of the transfer",
      sql: `SELECT src.full_name AS sender,
       dst.full_name AS recipient,
       t.amount_cents/100 AS amount,
       t.status
FROM transfers t
JOIN accounts  sa  ON sa.id  = t.from_account_id
JOIN accounts  da  ON da.id  = t.to_account_id
JOIN customers src ON src.id = sa.customer_id
JOIN customers dst ON dst.id = da.customer_id
WHERE t.status = 'settled'
ORDER BY t.amount_cents DESC
LIMIT 25;`,
    },
    {
      label: "5. Customers with several accounts",
      hint: "HAVING on a grouped count, then a correlated total",
      sql: `SELECT c.full_name, c.kyc_level,
       COUNT(a.id)              AS accounts,
       SUM(a.balance_cents)/100 AS total_balance
FROM customers c
JOIN accounts a ON a.customer_id = c.id
GROUP BY c.id, c.full_name, c.kyc_level
HAVING COUNT(a.id) > 1
ORDER BY total_balance DESC
LIMIT 25;`,
    },
    {
      label: "6. Balance disagreement",
      hint: "Stored balance vs the sum of the ledger — an integrity check",
      sql: `SELECT a.id, c.full_name,
       a.balance_cents                  AS stored,
       COALESCE(SUM(t.amount_cents), 0) AS ledger_sum
FROM accounts a
JOIN customers c        ON c.id = a.customer_id
LEFT JOIN transactions t ON t.account_id = a.id
GROUP BY a.id, c.full_name, a.balance_cents
HAVING a.balance_cents <> COALESCE(SUM(t.amount_cents), 0)
ORDER BY a.id
LIMIT 25;`,
    },
  ],
};

const employees: Dataset = {
  id: "employees",
  name: "Employee directory",
  tagline:
    "Departments, reporting lines, salary history and project staffing.",
  size: "≈175k rows",
  sql: `
CREATE TABLE departments (
  id       integer PRIMARY KEY,
  name     text NOT NULL,
  location text NOT NULL
);

CREATE TABLE employees (
  id            integer PRIMARY KEY,
  full_name     text NOT NULL,
  department_id integer NOT NULL REFERENCES departments(id),
  manager_id    integer REFERENCES employees(id),
  title         text NOT NULL,
  hired_at      date NOT NULL
);

CREATE TABLE salaries (
  id             integer PRIMARY KEY,
  employee_id    integer NOT NULL REFERENCES employees(id),
  amount_cents   integer NOT NULL,
  effective_from date NOT NULL,
  effective_to   date
);

CREATE TABLE projects (
  id            integer PRIMARY KEY,
  name          text NOT NULL,
  department_id integer NOT NULL REFERENCES departments(id),
  started_at    date NOT NULL,
  ended_at      date
);

-- Many-to-many: the join table is where most real queries live.
CREATE TABLE project_assignments (
  id             integer PRIMARY KEY,
  project_id     integer NOT NULL REFERENCES projects(id),
  employee_id    integer NOT NULL REFERENCES employees(id),
  role           text NOT NULL,
  allocation_pct smallint NOT NULL
);

INSERT INTO departments (id, name, location)
SELECT g,
  (ARRAY['Engineering','Sales','Support','Finance','People','Legal',
         'Marketing','Operations','Research','Security','Design','Data'])[1 + (g % 12)]
    || ' ' || (1 + g / 12),
  (ARRAY['Dhaka','Tokyo','Singapore','Berlin'])[1 + (g % 4)]
FROM generate_series(1, 24) AS g;

-- Managers are seeded first so manager_id always points at an existing row.
INSERT INTO employees (id, full_name, department_id, manager_id, title, hired_at)
SELECT g, 'Manager ' || g, 1 + (g % 24), NULL, 'Manager',
  DATE '2015-01-01' + ((g * 29) % 2000)
FROM generate_series(1, 500) AS g;

INSERT INTO employees (id, full_name, department_id, manager_id, title, hired_at)
SELECT g, 'Employee ' || g,
  1 + (g % 24),
  1 + (g * 7) % 500,
  (ARRAY['Engineer','Senior Engineer','Analyst','Specialist','Coordinator'])[1 + (g % 5)],
  DATE '2018-01-01' + ((g * 13) % 2500)
FROM generate_series(501, 25000) AS g;

INSERT INTO salaries (id, employee_id, amount_cents, effective_from, effective_to)
SELECT g,
  1 + (g % 25000),
  3000000 + (g * 733) % 12000000,
  DATE '2021-01-01' + ((g % 4) * 365),
  CASE WHEN g % 4 = 3 THEN NULL
       ELSE DATE '2021-12-31' + ((g % 4) * 365) END
FROM generate_series(1, 90000) AS g;

INSERT INTO projects (id, name, department_id, started_at, ended_at)
SELECT g, 'Project ' || g,
  1 + (g % 24),
  DATE '2023-01-01' + ((g * 11) % 900),
  CASE WHEN g % 3 = 0 THEN NULL
       ELSE DATE '2023-01-01' + ((g * 11) % 900) + (30 + (g % 300)) END
FROM generate_series(1, 300) AS g;

INSERT INTO project_assignments (id, project_id, employee_id, role, allocation_pct)
SELECT g,
  1 + (g % 300),
  1 + (g * 7) % 25000,
  (ARRAY['contributor','contributor','contributor','lead','reviewer'])[1 + (g % 5)],
  (ARRAY[10,20,25,50,75,100])[1 + (g % 6)]
FROM generate_series(1, 60000) AS g;
`,
  snippets: [
    {
      label: "1. Salary history lookup",
      hint: "salaries.employee_id has no index — 90k rows scanned for a handful",
      sql: `SELECT amount_cents, effective_from, effective_to
FROM salaries
WHERE employee_id = 8080
ORDER BY effective_from;`,
    },
    {
      label: "2. Add the index",
      hint: "Re-run query 1 and compare",
      sql: `CREATE INDEX idx_salaries_employee
  ON salaries (employee_id);

ANALYZE salaries;`,
    },
    {
      label: "3. Employees and their managers",
      hint: "A self-join on an unindexed manager_id",
      sql: `SELECT e.full_name AS employee,
       m.full_name AS manager,
       d.name      AS department
FROM employees e
JOIN employees   m ON m.id = e.manager_id
JOIN departments d ON d.id = e.department_id
ORDER BY d.name, m.full_name
LIMIT 50;`,
    },
    {
      label: "4. Over-allocated people",
      hint: "Sum a many-to-many across 60k assignments, filter with HAVING",
      sql: `SELECT e.full_name,
       COUNT(*)               AS projects,
       SUM(pa.allocation_pct) AS total_pct
FROM project_assignments pa
JOIN employees e ON e.id = pa.employee_id
GROUP BY e.id, e.full_name
HAVING SUM(pa.allocation_pct) > 100
ORDER BY total_pct DESC
LIMIT 25;`,
    },
    {
      label: "5. Active project staffing",
      hint: "Open projects (ended_at IS NULL) and who leads them",
      sql: `SELECT p.name AS project, d.name AS department,
       COUNT(*) FILTER (WHERE pa.role = 'lead')        AS leads,
       COUNT(*) FILTER (WHERE pa.role = 'contributor') AS contributors
FROM projects p
JOIN departments d          ON d.id = p.department_id
LEFT JOIN project_assignments pa ON pa.project_id = p.id
WHERE p.ended_at IS NULL
GROUP BY p.name, d.name
ORDER BY contributors DESC
LIMIT 25;`,
    },
    {
      label: "6. Paid more than their manager",
      hint: "The classic interview query — two joins back into salaries",
      sql: `SELECT e.full_name AS employee, es.amount_cents/100 AS employee_pay,
       m.full_name AS manager,  ms.amount_cents/100 AS manager_pay
FROM employees e
JOIN employees m  ON m.id = e.manager_id
JOIN salaries  es ON es.employee_id = e.id AND es.effective_to IS NULL
JOIN salaries  ms ON ms.employee_id = m.id AND ms.effective_to IS NULL
WHERE es.amount_cents > ms.amount_cents
ORDER BY es.amount_cents - ms.amount_cents DESC
LIMIT 25;`,
    },
  ],
};

const analytics: Dataset = {
  id: "analytics",
  name: "Web analytics",
  tagline: "Visitors, sessions, 180k page views and events — funnels over time.",
  size: "≈302k rows",
  sql: `
CREATE TABLE visitors (
  id            integer PRIMARY KEY,
  first_seen_at timestamp NOT NULL,
  country       text NOT NULL,
  signed_up_at  timestamp
);

CREATE TABLE sessions (
  id         integer PRIMARY KEY,
  visitor_id integer NOT NULL REFERENCES visitors(id),
  started_at timestamp NOT NULL,
  device     text NOT NULL,
  referrer   text NOT NULL
);

CREATE TABLE page_views (
  id          integer PRIMARY KEY,
  session_id  integer NOT NULL REFERENCES sessions(id),
  path        text NOT NULL,
  viewed_at   timestamp NOT NULL,
  ms_on_page  integer NOT NULL
);

CREATE TABLE events (
  id           integer PRIMARY KEY,
  session_id   integer NOT NULL REFERENCES sessions(id),
  name         text NOT NULL,
  occurred_at  timestamp NOT NULL,
  value_cents  integer
);

INSERT INTO visitors (id, first_seen_at, country, signed_up_at)
SELECT g,
  TIMESTAMP '2025-12-01 00:00:00' + ((g % 200) || ' days')::interval,
  (ARRAY['BD','JP','US','GB','DE','IN','SG','BR'])[1 + (g % 8)],
  CASE WHEN g % 5 = 0
       THEN TIMESTAMP '2026-01-01 00:00:00' + ((g % 180) || ' days')::interval
       ELSE NULL END
FROM generate_series(1, 12000) AS g;

INSERT INTO sessions (id, visitor_id, started_at, device, referrer)
SELECT g,
  1 + (g * 3) % 12000,
  TIMESTAMP '2026-01-01 00:00:00' + ((g % 180) || ' days')::interval
    + ((g % 1440) || ' minutes')::interval,
  (ARRAY['mobile','mobile','desktop','tablet'])[1 + (g % 4)],
  (ARRAY['google','direct','linkedin','x','newsletter'])[1 + (g % 5)]
FROM generate_series(1, 30000) AS g;

INSERT INTO page_views (id, session_id, path, viewed_at, ms_on_page)
SELECT g,
  1 + (g % 30000),
  (ARRAY['/','/pricing','/docs','/cart','/checkout','/blog','/about','/signup'])[1 + (g % 8)],
  TIMESTAMP '2026-01-01 00:00:00' + ((g % 180) || ' days')::interval
    + ((g % 1440) || ' minutes')::interval,
  500 + (g * 37) % 240000
FROM generate_series(1, 180000) AS g;

-- value_cents is NULL for everything except purchases.
INSERT INTO events (id, session_id, name, occurred_at, value_cents)
SELECT g,
  1 + (g % 30000),
  (ARRAY['signup','add_to_cart','add_to_cart','purchase','share','search'])[1 + (g % 6)],
  TIMESTAMP '2026-01-01 00:00:00' + ((g % 180) || ' days')::interval
    + ((g % 1440) || ' minutes')::interval,
  CASE WHEN g % 6 = 3 THEN 1500 + (g * 71) % 90000 ELSE NULL END
FROM generate_series(1, 80000) AS g;
`,
  snippets: [
    {
      label: "1. One session's journey",
      hint: "page_views.session_id has no index — 180k rows scanned for ~6",
      sql: `SELECT path, viewed_at, ms_on_page
FROM page_views
WHERE session_id = 17777
ORDER BY viewed_at;`,
    },
    {
      label: "2. Add the index",
      hint: "Re-run query 1 and compare the plan",
      sql: `CREATE INDEX idx_page_views_session
  ON page_views (session_id);

ANALYZE page_views;`,
    },
    {
      label: "3. Daily traffic",
      hint: "date_trunc + GROUP BY over 180k rows — watch the aggregate strategy",
      sql: `SELECT date_trunc('day', viewed_at) AS day,
       COUNT(*)                        AS views,
       COUNT(DISTINCT session_id)      AS sessions
FROM page_views
GROUP BY day
ORDER BY day
LIMIT 60;`,
    },
    {
      label: "4. Revenue by channel",
      hint: "Purchases carry a value; everything else is NULL",
      sql: `SELECT s.referrer,
       COUNT(*) FILTER (WHERE e.name = 'purchase') AS purchases,
       COALESCE(SUM(e.value_cents), 0)/100         AS revenue
FROM events e
JOIN sessions s ON s.id = e.session_id
GROUP BY s.referrer
ORDER BY revenue DESC;`,
    },
    {
      label: "5. Signup conversion by country",
      hint: "visitors.signed_up_at is NULL for most — a ratio over a LEFT side",
      sql: `SELECT v.country,
       COUNT(*)                                              AS visitors,
       COUNT(v.signed_up_at)                                 AS signed_up,
       ROUND(100.0 * COUNT(v.signed_up_at) / COUNT(*), 1)    AS pct
FROM visitors v
GROUP BY v.country
ORDER BY pct DESC;`,
    },
    {
      label: "6. Cart to checkout",
      hint: "A two-step funnel with a correlated EXISTS",
      sql: `SELECT COUNT(DISTINCT cart.session_id) AS reached_checkout
FROM page_views cart
WHERE cart.path = '/cart'
  AND EXISTS (
    SELECT 1 FROM page_views co
    WHERE co.session_id = cart.session_id
      AND co.path = '/checkout'
      AND co.viewed_at > cart.viewed_at
  );`,
    },
  ],
};

export const DATASETS: Dataset[] = [
  golf,
  ecommerce,
  banking,
  employees,
  analytics,
];

export const DEFAULT_DATASET_ID = golf.id;

/** Persisted so a restored query is never run against a different schema. */
export const DATASET_STORAGE_KEY = "playground:dataset";

export function getDataset(id: string): Dataset {
  return DATASETS.find((d) => d.id === id) ?? DATASETS[0];
}

/**
 * Wipes everything — including tables the user created — so switching datasets
 * never leaves the previous schema behind.
 */
export const RESET_SQL = `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`;
