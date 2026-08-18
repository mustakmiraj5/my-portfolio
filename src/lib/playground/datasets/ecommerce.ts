import type { DatasetModule } from "./types";

/**
 * Storefront: customers place orders, orders carry line items, and both
 * payments and reviews hang off the graph. `order_items.order_id` is the
 * unindexed foreign key the first lesson targets.
 */
const ecommerce: DatasetModule = {
  sql: `
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id),
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    status VARCHAR(30) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    amount DECIMAL(10, 2) NOT NULL,
    method VARCHAR(30),
    status VARCHAR(30),
    paid_at TIMESTAMP
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    product_id INTEGER REFERENCES products(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (id, name)
SELECT g, (ARRAY['Electronics','Kitchen','Outdoor','Books','Apparel','Toys','Sports','Beauty'])[g]
FROM generate_series(1, 8) AS g;

INSERT INTO customers (id, name, email, city, country, created_at)
SELECT g,
  'Customer ' || g,
  'customer' || g || '@example.com',
  (ARRAY['Dhaka','Tokyo','London','Berlin','Singapore','Sydney','Toronto','Dubai'])[1 + (g % 8)],
  (ARRAY['BD','JP','GB','DE','SG','AU','CA','AE'])[1 + (g % 8)],
  TIMESTAMP '2023-01-01 00:00:00' + ((g % 700) || ' days')::interval
FROM generate_series(1, 3000) AS g;

INSERT INTO products (id, category_id, name, price, stock, created_at)
SELECT g,
  1 + (g % 8),
  'Product ' || g,
  ((500 + (g * 173) % 49500)::numeric / 100),
  CASE WHEN g % 17 = 0 THEN 0 ELSE (g * 7) % 400 END,
  TIMESTAMP '2023-06-01 00:00:00' + ((g % 500) || ' days')::interval
FROM generate_series(1, 600) AS g;

INSERT INTO orders (id, customer_id, status, order_date)
SELECT g,
  1 + (g * 3) % 3000,
  (ARRAY['paid','paid','paid','shipped','delivered','refunded'])[1 + (g % 6)],
  TIMESTAMP '2025-01-01 00:00:00' + ((g % 400) || ' days')::interval
    + ((g % 1440) || ' minutes')::interval
FROM generate_series(1, 8000) AS g;

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
SELECT g,
  1 + (g % 8000),
  1 + (g * 7) % 600,
  1 + (g % 5),
  ((500 + (g * 173) % 49500)::numeric / 100)
FROM generate_series(1, 25000) AS g;

-- One payment per order for the first 6,000 orders, so the rest are unpaid.
INSERT INTO payments (id, order_id, amount, method, status, paid_at)
SELECT g, g,
  ((1500 + (g * 271) % 98500)::numeric / 100),
  (ARRAY['card','card','bkash','bank_transfer','paypal'])[1 + (g % 5)],
  (ARRAY['captured','captured','captured','captured','refunded','failed'])[1 + (g % 6)],
  TIMESTAMP '2025-01-02 00:00:00' + ((g % 400) || ' days')::interval
FROM generate_series(1, 6000) AS g;

INSERT INTO reviews (id, customer_id, product_id, rating, comment, created_at)
SELECT g,
  1 + (g * 11) % 3000,
  1 + (g * 13) % 600,
  1 + (g % 5),
  'Review body ' || g,
  TIMESTAMP '2025-02-01 00:00:00' + ((g % 380) || ' days')::interval
FROM generate_series(1, 4000) AS g;
`,
  snippets: [
    {
      label: "1. Line items for one order",
      hint: "order_items.order_id has no index — a Seq Scan over 25k rows to find ~3",
      sql: `SELECT id, product_id, quantity, unit_price
FROM order_items
WHERE order_id = 4242;`,
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
      hint: "Three joins and an aggregate over every line item",
      sql: `SELECT c.name AS category,
       COUNT(DISTINCT o.id)               AS orders,
       SUM(oi.quantity * oi.unit_price)   AS revenue
FROM order_items oi
JOIN orders     o ON o.id = oi.order_id
JOIN products   p ON p.id = oi.product_id
JOIN categories c ON c.id = p.category_id
WHERE o.status <> 'refunded'
GROUP BY c.name
ORDER BY revenue DESC;`,
    },
    {
      label: "4. Top customers",
      hint: "Aggregate the line items, then join the customer back on",
      sql: `SELECT cu.name, cu.country,
       COUNT(DISTINCT o.id)             AS orders,
       SUM(oi.quantity * oi.unit_price) AS spent
FROM orders o
JOIN customers  cu ON cu.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status IN ('paid','shipped','delivered')
GROUP BY cu.id, cu.name, cu.country
ORDER BY spent DESC
LIMIT 20;`,
    },
    {
      label: "5. Unpaid orders",
      hint: "Orders with no captured payment — NOT EXISTS over two tables",
      sql: `SELECT o.id, o.order_date, o.status
FROM orders o
WHERE o.status IN ('paid','shipped','delivered')
  AND NOT EXISTS (
    SELECT 1 FROM payments p
    WHERE p.order_id = o.id AND p.status = 'captured'
  )
ORDER BY o.order_date
LIMIT 50;`,
    },
    {
      label: "6. Never ordered, but reviewed",
      hint: "An anti-join crossed with a semi-join — products reviewed yet never bought",
      sql: `SELECT p.id, p.name, ROUND(AVG(r.rating), 2) AS avg_rating
FROM products p
JOIN reviews r ON r.product_id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
)
GROUP BY p.id, p.name
ORDER BY avg_rating DESC;`,
    },
  ],
};

export default ecommerce;
