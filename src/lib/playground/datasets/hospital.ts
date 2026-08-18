import type { DatasetModule } from "./types";

/**
 * Clinic: departments staff doctors, doctors see patients at appointments, and
 * diagnoses and prescriptions hang off each appointment — a four-deep chain.
 * Admissions and rooms sit alongside. `prescriptions.appointment_id` is the
 * unindexed foreign key the first lesson targets.
 */
const hospital: DatasetModule = {
  sql: `
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id),
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    email VARCHAR(150),
    hire_date DATE
);

CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    phone VARCHAR(30),
    city VARCHAR(100),
    registered_at DATE DEFAULT CURRENT_DATE
);

CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    doctor_id INTEGER REFERENCES doctors(id),
    appointment_date TIMESTAMP,
    status VARCHAR(30),
    reason TEXT
);

CREATE TABLE diagnoses (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id),
    diagnosis VARCHAR(200),
    notes TEXT
);

CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150),
    manufacturer VARCHAR(150),
    unit_price DECIMAL(10, 2)
);

CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id),
    medication_id INTEGER REFERENCES medications(id),
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration_days INTEGER
);

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(20),
    room_type VARCHAR(50),
    daily_cost DECIMAL(10, 2)
);

CREATE TABLE admissions (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    room_id INTEGER REFERENCES rooms(id),
    admitted_at TIMESTAMP,
    discharged_at TIMESTAMP
);

INSERT INTO departments (id, name)
SELECT g,
  (ARRAY['Cardiology','Neurology','Orthopaedics','Paediatrics','Oncology',
         'Dermatology','Emergency','Radiology','Psychiatry','General Medicine'])[g]
FROM generate_series(1, 10) AS g;

INSERT INTO doctors (id, department_id, name, specialization, email, hire_date)
SELECT g,
  1 + (g % 10),
  'Dr. ' || g,
  (ARRAY['Interventional','Paediatric','Surgical','Diagnostic','Consultant'])[1 + (g % 5)],
  'doctor' || g || '@hospital.org',
  DATE '2013-01-01' + ((g * 61) % 3600)
FROM generate_series(1, 150) AS g;

INSERT INTO patients (id, name, date_of_birth, gender, phone, city, registered_at)
SELECT g,
  'Patient ' || g,
  DATE '1950-01-01' + ((g * 79) % 24000),
  (ARRAY['female','male','male','female','other'])[1 + (g % 5)],
  '+8801' || LPAD(((g * 613) % 100000000)::text, 9, '0'),
  (ARRAY['Dhaka','Chattogram','Sylhet','Khulna','Rajshahi','Barishal','Rangpur','Mymensingh'])[1 + (g % 8)],
  DATE '2021-01-01' + ((g * 11) % 1600)
FROM generate_series(1, 4000) AS g;

INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, status, reason)
SELECT g,
  1 + (g * 7) % 4000,
  1 + (g % 150),
  TIMESTAMP '2025-01-02 08:00:00' + ((g % 420) || ' days')::interval
    + (((g % 16) * 30) || ' minutes')::interval,
  (ARRAY['completed','completed','completed','completed','cancelled','no_show'])[1 + (g % 6)],
  (ARRAY['follow-up','new complaint','routine check','referral','post-op review'])[1 + (g % 5)]
FROM generate_series(1, 12000) AS g;

INSERT INTO medications (id, name, manufacturer, unit_price)
SELECT g,
  'Medication ' || g,
  (ARRAY['Beximco','Square','Incepta','Renata','ACI','Novartis'])[1 + (g % 6)],
  ((150 + (g * 97) % 480000)::numeric / 100)
FROM generate_series(1, 200) AS g;

-- Two thirds of appointments end with a recorded diagnosis.
INSERT INTO diagnoses (id, appointment_id, diagnosis, notes)
SELECT g,
  1 + (g % 12000),
  (ARRAY['Hypertension','Type 2 diabetes','Migraine','Fracture','Anaemia',
         'Asthma','Dermatitis','Arrhythmia'])[1 + (g % 8)],
  'Clinical note ' || g
FROM generate_series(1, 8000) AS g;

INSERT INTO prescriptions (id, appointment_id, medication_id, dosage, frequency, duration_days)
SELECT g,
  1 + (g % 12000),
  1 + (g * 7) % 200,
  (ARRAY['5 mg','10 mg','20 mg','250 mg','500 mg'])[1 + (g % 5)],
  (ARRAY['once daily','twice daily','three times daily','as needed'])[1 + (g % 4)],
  (ARRAY[3,5,7,14,30,90])[1 + (g % 6)]
FROM generate_series(1, 15000) AS g;

INSERT INTO rooms (id, room_number, room_type, daily_cost)
SELECT g,
  'R' || LPAD(g::text, 4, '0'),
  (ARRAY['general','general','semi-private','private','icu'])[1 + (g % 5)],
  ((250000 + (g * 4111) % 1500000)::numeric / 100)
FROM generate_series(1, 80) AS g;

-- One admission in six is still open, so discharged_at is NULL.
INSERT INTO admissions (id, patient_id, room_id, admitted_at, discharged_at)
SELECT g,
  1 + (g * 11) % 4000,
  1 + (g % 80),
  TIMESTAMP '2025-01-01 00:00:00' + ((g % 420) || ' days')::interval,
  CASE WHEN g % 6 = 0 THEN NULL
       ELSE TIMESTAMP '2025-01-01 00:00:00' + ((g % 420) || ' days')::interval
            + (((g % 12) + 1) || ' days')::interval END
FROM generate_series(1, 3000) AS g;
`,
  snippets: [
    {
      label: "1. Prescriptions for one visit",
      hint: "prescriptions.appointment_id has no index — 15k rows scanned to find ~2",
      sql: `SELECT id, medication_id, dosage, frequency, duration_days
FROM prescriptions
WHERE appointment_id = 4321;`,
    },
    {
      label: "2. Add the index",
      hint: "Re-run query 1 — Seq Scan should become an Index Scan",
      sql: `CREATE INDEX idx_prescriptions_appointment
  ON prescriptions (appointment_id);

ANALYZE prescriptions;`,
    },
    {
      label: "3. Workload by department",
      hint: "Aggregate 12k appointments up through doctors to departments",
      sql: `SELECT d.name AS department,
       COUNT(DISTINCT doc.id)                                   AS doctors,
       COUNT(a.id)                                              AS appointments,
       COUNT(*) FILTER (WHERE a.status = 'no_show')             AS no_shows
FROM appointments a
JOIN doctors     doc ON doc.id = a.doctor_id
JOIN departments d   ON d.id = doc.department_id
GROUP BY d.name
ORDER BY appointments DESC;`,
    },
    {
      label: "4. Most prescribed medications",
      hint: "The full chain: medication to prescription to appointment",
      sql: `SELECT m.name, m.manufacturer,
       COUNT(*)                              AS times_prescribed,
       ROUND(SUM(m.unit_price * p.duration_days), 2) AS course_value
FROM prescriptions p
JOIN medications  m ON m.id = p.medication_id
JOIN appointments a ON a.id = p.appointment_id
WHERE a.status = 'completed'
GROUP BY m.id, m.name, m.manufacturer
ORDER BY times_prescribed DESC
LIMIT 20;`,
    },
    {
      label: "5. Still admitted",
      hint: "discharged_at IS NULL — current inpatients and what their bed costs",
      sql: `SELECT p.name, r.room_number, r.room_type,
       a.admitted_at::date                                        AS since,
       DATE_PART('day', now() - a.admitted_at)::int                AS days_so_far,
       ROUND((r.daily_cost * DATE_PART('day', now() - a.admitted_at))::numeric, 2) AS running_cost
FROM admissions a
JOIN patients p ON p.id = a.patient_id
JOIN rooms    r ON r.id = a.room_id
WHERE a.discharged_at IS NULL
ORDER BY a.admitted_at
LIMIT 30;`,
    },
    {
      label: "6. Length of stay by room type",
      hint: "Interval arithmetic across 3k admissions, ignoring the open ones",
      sql: `SELECT r.room_type,
       COUNT(*)                                                        AS stays,
       ROUND(AVG(EXTRACT(EPOCH FROM (a.discharged_at - a.admitted_at))
                 / 86400)::numeric, 2)                                  AS avg_days,
       ROUND(SUM(r.daily_cost
                 * EXTRACT(EPOCH FROM (a.discharged_at - a.admitted_at))
                 / 86400)::numeric, 2)                                  AS billed
FROM admissions a
JOIN rooms r ON r.id = a.room_id
WHERE a.discharged_at IS NOT NULL
GROUP BY r.room_type
ORDER BY avg_days DESC;`,
    },
  ],
};

export default hospital;
