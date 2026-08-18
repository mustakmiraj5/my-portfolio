import type { DatasetModule } from "./types";

/**
 * Ride hailing: passengers request rides, drivers fulfil them in vehicles,
 * rides reference two locations (pickup and dropoff), and payments and reviews
 * are derived from the rides themselves so a review always names the driver
 * who actually drove it. `payments.ride_id` is the first lesson's target.
 */
const transportation: DatasetModule = {
  sql: `
CREATE TABLE passengers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30),
    city VARCHAR(100),
    registered_at DATE DEFAULT CURRENT_DATE
);

CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    license_number VARCHAR(50) UNIQUE,
    rating DECIMAL(3, 2),
    joined_at DATE
);

CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id),
    registration_number VARCHAR(30) UNIQUE,
    vehicle_type VARCHAR(50),
    brand VARCHAR(50),
    model VARCHAR(50),
    year INTEGER
);

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150),
    city VARCHAR(100),
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6)
);

CREATE TABLE rides (
    id SERIAL PRIMARY KEY,
    passenger_id INTEGER REFERENCES passengers(id),
    driver_id INTEGER REFERENCES drivers(id),
    vehicle_id INTEGER REFERENCES vehicles(id),
    pickup_location_id INTEGER REFERENCES locations(id),
    dropoff_location_id INTEGER REFERENCES locations(id),
    requested_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(30),
    fare DECIMAL(10, 2)
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER REFERENCES rides(id),
    amount DECIMAL(10, 2),
    method VARCHAR(30),
    status VARCHAR(30),
    paid_at TIMESTAMP
);

CREATE TABLE driver_reviews (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER REFERENCES rides(id),
    passenger_id INTEGER REFERENCES passengers(id),
    driver_id INTEGER REFERENCES drivers(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO passengers (id, name, email, phone, city, registered_at)
SELECT g,
  'Passenger ' || g,
  'passenger' || g || '@example.com',
  '+8801' || LPAD(((g * 787) % 100000000)::text, 9, '0'),
  (ARRAY['Dhaka','Chattogram','Sylhet','Khulna','Rajshahi','Gazipur'])[1 + (g % 6)],
  DATE '2022-01-01' + ((g * 13) % 1300)
FROM generate_series(1, 3000) AS g;

INSERT INTO drivers (id, name, phone, license_number, rating, joined_at)
SELECT g,
  'Driver ' || g,
  '+8801' || LPAD(((g * 331) % 100000000)::text, 9, '0'),
  'DL-' || LPAD(g::text, 8, '0'),
  ((300 + (g * 17) % 200)::numeric / 100),
  DATE '2021-06-01' + ((g * 23) % 1500)
FROM generate_series(1, 800) AS g;

INSERT INTO vehicles (id, driver_id, registration_number, vehicle_type, brand, model, year)
SELECT g,
  1 + (g % 800),
  'DHA-' || LPAD(g::text, 6, '0'),
  (ARRAY['sedan','sedan','hatchback','suv','cng','motorbike'])[1 + (g % 6)],
  (ARRAY['Toyota','Honda','Suzuki','Nissan','Hyundai','Mitsubishi'])[1 + (g % 6)],
  'Model ' || (1 + (g % 40)),
  2010 + (g % 15)
FROM generate_series(1, 850) AS g;

INSERT INTO locations (id, name, city, latitude, longitude)
SELECT g,
  (ARRAY['Gulshan','Banani','Dhanmondi','Uttara','Mirpur','Motijheel','Mohakhali','Bashundhara'])[1 + (g % 8)]
    || ' ' || (1 + g / 8),
  (ARRAY['Dhaka','Chattogram','Sylhet','Khulna','Rajshahi','Gazipur'])[1 + (g % 6)],
  ((23500000 + (g * 971) % 900000)::numeric / 1000000),
  ((90300000 + (g * 1231) % 900000)::numeric / 1000000)
FROM generate_series(1, 300) AS g;

-- Four rides in six complete; cancelled rides never start, so started_at and
-- completed_at stay NULL and every duration query has to account for it.
INSERT INTO rides (id, passenger_id, driver_id, vehicle_id, pickup_location_id, dropoff_location_id,
                   requested_at, started_at, completed_at, status, fare)
SELECT g,
  1 + (g * 7) % 3000,
  1 + (g % 800),
  1 + (g % 850),
  1 + (g % 300),
  1 + ((g * 13) % 300),
  TIMESTAMP '2026-01-01 00:00:00' + ((g % 200) || ' days')::interval
    + ((g % 1440) || ' minutes')::interval,
  CASE WHEN (g % 6) < 4
       THEN TIMESTAMP '2026-01-01 00:00:00' + ((g % 200) || ' days')::interval
            + ((g % 1440) || ' minutes')::interval + (((g % 9) + 2) || ' minutes')::interval
       ELSE NULL END,
  CASE WHEN (g % 6) < 4
       THEN TIMESTAMP '2026-01-01 00:00:00' + ((g % 200) || ' days')::interval
            + ((g % 1440) || ' minutes')::interval
            + (((g % 9) + 2) || ' minutes')::interval
            + (((g % 45) + 5) || ' minutes')::interval
       ELSE NULL END,
  (ARRAY['completed','completed','completed','completed','cancelled','no_driver'])[1 + (g % 6)],
  ((8000 + (g * 379) % 220000)::numeric / 100)
FROM generate_series(1, 20000) AS g;

-- Derived from the rides so the amount always matches the fare. No explicit
-- id, so these two tables exercise the SERIAL sequences directly.
INSERT INTO payments (ride_id, amount, method, status, paid_at)
SELECT r.id, r.fare,
  (ARRAY['card','card','bkash','cash','nagad'])[1 + (r.id % 5)],
  (ARRAY['captured','captured','captured','captured','failed'])[1 + (r.id % 5)],
  r.completed_at
FROM rides r
WHERE r.status = 'completed'
ORDER BY r.id;

INSERT INTO driver_reviews (ride_id, passenger_id, driver_id, rating, comment, created_at)
SELECT r.id, r.passenger_id, r.driver_id,
  1 + (r.id % 5),
  'Ride feedback ' || r.id,
  r.completed_at
FROM rides r
WHERE r.status = 'completed' AND r.id % 2 = 0
ORDER BY r.id;
`,
  snippets: [
    {
      label: "1. Payment for one ride",
      hint: "payments.ride_id has no index — a Seq Scan over every payment to find one",
      sql: `SELECT id, amount, method, status, paid_at
FROM payments
WHERE ride_id = 8888;`,
    },
    {
      label: "2. Add the index",
      hint: "Re-run query 1 — Seq Scan should become an Index Scan",
      sql: `CREATE INDEX idx_payments_ride
  ON payments (ride_id);

ANALYZE payments;`,
    },
    {
      label: "3. Driver earnings",
      hint: "Captured payments only, joined back to the driver through the ride",
      sql: `SELECT d.name, d.rating,
       COUNT(*)             AS rides_paid,
       ROUND(SUM(p.amount), 2) AS earned
FROM payments p
JOIN rides   r ON r.id = p.ride_id
JOIN drivers d ON d.id = r.driver_id
WHERE p.status = 'captured'
GROUP BY d.id, d.name, d.rating
ORDER BY earned DESC
LIMIT 20;`,
    },
    {
      label: "4. Ride duration by route",
      hint: "locations joined twice — once for pickup, once for dropoff",
      sql: `SELECT pu.name AS pickup, dr.name AS dropoff,
       COUNT(*)                                                       AS rides,
       ROUND(AVG(EXTRACT(EPOCH FROM (r.completed_at - r.started_at))
                 / 60)::numeric, 1)                                    AS avg_minutes
FROM rides r
JOIN locations pu ON pu.id = r.pickup_location_id
JOIN locations dr ON dr.id = r.dropoff_location_id
WHERE r.completed_at IS NOT NULL
GROUP BY pu.name, dr.name
HAVING COUNT(*) > 5
ORDER BY avg_minutes DESC
LIMIT 25;`,
    },
    {
      label: "5. Cancellation rate by city",
      hint: "A ratio built from FILTER, grouped through the pickup location",
      sql: `SELECT l.city,
       COUNT(*)                                                        AS requested,
       COUNT(*) FILTER (WHERE r.status <> 'completed')                 AS not_completed,
       ROUND(100.0 * COUNT(*) FILTER (WHERE r.status <> 'completed')
             / COUNT(*), 1)                                            AS pct_lost
FROM rides r
JOIN locations l ON l.id = r.pickup_location_id
GROUP BY l.city
ORDER BY pct_lost DESC;`,
    },
    {
      label: "6. Rated below their average",
      hint: "Compare a driver's review average against the profile rating on file",
      sql: `SELECT d.name,
       d.rating                     AS profile_rating,
       ROUND(AVG(dr.rating), 2)     AS reviewed_rating,
       COUNT(*)                     AS reviews
FROM driver_reviews dr
JOIN drivers d ON d.id = dr.driver_id
GROUP BY d.id, d.name, d.rating
HAVING AVG(dr.rating) < d.rating - 0.5
ORDER BY d.rating - AVG(dr.rating) DESC
LIMIT 25;`,
    },
  ],
};

export default transportation;
