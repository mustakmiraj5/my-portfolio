import type { DatasetModule } from "./types";

/**
 * Retail bank: customers hold accounts at branches, accounts carry a 25k-row
 * ledger, and loans, loan payments and cards hang off the customer.
 * `transactions.account_id` is the unindexed foreign key the first lesson hits.
 */
const banking: DatasetModule = {
  sql: `
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30),
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    address TEXT
);

CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    branch_id INTEGER REFERENCES branches(id),
    account_number VARCHAR(30) UNIQUE NOT NULL,
    account_type VARCHAR(30) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0,
    opened_at DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    transaction_type VARCHAR(30) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loans (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    branch_id INTEGER REFERENCES branches(id),
    loan_type VARCHAR(50),
    principal DECIMAL(15, 2),
    interest_rate DECIMAL(5, 2),
    status VARCHAR(30),
    issued_at DATE
);

CREATE TABLE loan_payments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES loans(id),
    amount DECIMAL(15, 2),
    payment_date DATE
);

CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    account_id INTEGER REFERENCES accounts(id),
    card_type VARCHAR(30),
    last_four CHAR(4),
    status VARCHAR(20),
    issued_at DATE
);

INSERT INTO branches (id, name, city, address)
SELECT g, 'Branch ' || g,
  (ARRAY['Dhaka','Chattogram','Sylhet','Khulna','Rajshahi','Barishal'])[1 + (g % 6)],
  g || ' Main Road'
FROM generate_series(1, 20) AS g;

INSERT INTO customers (id, name, email, phone, city, created_at)
SELECT g,
  'Holder ' || g,
  'holder' || g || '@example.com',
  '+8801' || LPAD(((g * 977) % 100000000)::text, 9, '0'),
  (ARRAY['Dhaka','Chattogram','Sylhet','Khulna','Rajshahi','Barishal'])[1 + (g % 6)],
  TIMESTAMP '2018-01-01 00:00:00' + ((g * 17 % 2600) || ' days')::interval
FROM generate_series(1, 2000) AS g;

-- 2,600 accounts over 2,000 customers, so some customers hold more than one.
INSERT INTO accounts (id, customer_id, branch_id, account_number, account_type, balance, opened_at, status)
SELECT g,
  1 + (g % 2000),
  1 + (g % 20),
  'ACC-' || LPAD(g::text, 10, '0'),
  (ARRAY['current','savings','savings','fixed'])[1 + (g % 4)],
  (((g * 9773) % 5000000)::numeric / 100),
  DATE '2019-01-01' + ((g * 13) % 2200),
  CASE WHEN g % 41 = 0 THEN 'frozen' ELSE 'active' END
FROM generate_series(1, 2600) AS g;

INSERT INTO transactions (id, account_id, transaction_type, amount, description, transaction_date)
SELECT g,
  1 + (g * 11) % 2600,
  (ARRAY['deposit','withdrawal','transfer','fee','interest'])[1 + (g % 5)],
  CASE WHEN g % 3 = 0
       THEN -(((g * 79) % 900000 + 100)::numeric / 100)
       ELSE  (((g * 53) % 1200000 + 100)::numeric / 100) END,
  'Txn reference ' || g,
  TIMESTAMP '2025-01-01 00:00:00' + ((g % 400) || ' days')::interval
    + ((g % 1440) || ' minutes')::interval
FROM generate_series(1, 25000) AS g;

INSERT INTO loans (id, customer_id, branch_id, loan_type, principal, interest_rate, status, issued_at)
SELECT g,
  1 + (g * 7) % 2000,
  1 + (g % 20),
  (ARRAY['home','auto','personal','education','business'])[1 + (g % 5)],
  (((g * 4013) % 9000000 + 100000)::numeric / 100),
  ((450 + (g * 37) % 1100)::numeric / 100),
  (ARRAY['active','active','active','closed','defaulted'])[1 + (g % 5)],
  DATE '2021-01-01' + ((g * 11) % 1500)
FROM generate_series(1, 900) AS g;

INSERT INTO loan_payments (id, loan_id, amount, payment_date)
SELECT g,
  1 + (g % 900),
  (((g * 613) % 300000 + 5000)::numeric / 100),
  DATE '2022-01-01' + ((g * 7) % 1100)
FROM generate_series(1, 5000) AS g;

INSERT INTO cards (id, customer_id, account_id, card_type, last_four, status, issued_at)
SELECT g,
  1 + (g % 2000),
  1 + (g % 2600),
  (ARRAY['debit','debit','credit','prepaid'])[1 + (g % 4)],
  LPAD(((g * 37) % 10000)::text, 4, '0'),
  (ARRAY['active','active','active','blocked','expired'])[1 + (g % 5)],
  DATE '2022-06-01' + ((g * 19) % 1000)
FROM generate_series(1, 2200) AS g;
`,
  snippets: [
    {
      label: "1. Statement for one account",
      hint: "transactions.account_id has no index — 25k rows scanned for a handful",
      sql: `SELECT transaction_date, transaction_type, amount, description
FROM transactions
WHERE account_id = 1234
ORDER BY transaction_date DESC
LIMIT 50;`,
    },
    {
      label: "2. Add the index",
      hint: "A composite index also serves the ORDER BY — try it with and without the date",
      sql: `CREATE INDEX idx_transactions_account_date
  ON transactions (account_id, transaction_date DESC);

ANALYZE transactions;`,
    },
    {
      label: "3. Running balance",
      hint: "A window function walking one account's ledger in order",
      sql: `SELECT transaction_date,
       amount,
       SUM(amount) OVER (
         ORDER BY transaction_date, id
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_balance
FROM transactions
WHERE account_id = 1234
ORDER BY transaction_date
LIMIT 100;`,
    },
    {
      label: "4. Average balance by branch",
      hint: "Grouping through a small dimension table",
      sql: `SELECT b.name AS branch, b.city,
       COUNT(a.id)              AS accounts,
       ROUND(AVG(a.balance), 2) AS avg_balance,
       SUM(a.balance)           AS total_held
FROM accounts a
JOIN branches b ON b.id = a.branch_id
WHERE a.status = 'active'
GROUP BY b.id, b.name, b.city
ORDER BY total_held DESC;`,
    },
    {
      label: "5. Both a loan and an account",
      hint: "Two semi-joins on the same customer — EXISTS twice",
      sql: `SELECT c.name, c.city
FROM customers c
WHERE EXISTS (SELECT 1 FROM accounts a WHERE a.customer_id = c.id)
  AND EXISTS (SELECT 1 FROM loans   l WHERE l.customer_id = c.id
                                        AND l.status = 'active')
ORDER BY c.name
LIMIT 30;`,
    },
    {
      label: "6. Monthly volume",
      hint: "date_trunc over the whole ledger — watch the aggregate strategy",
      sql: `SELECT date_trunc('month', transaction_date) AS month,
       COUNT(*)                                AS entries,
       SUM(amount)                             AS net_flow,
       SUM(ABS(amount))                        AS gross_volume
FROM transactions
GROUP BY month
ORDER BY month;`,
    },
  ],
};

export default banking;
