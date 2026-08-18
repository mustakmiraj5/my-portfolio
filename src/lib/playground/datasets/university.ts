import type { DatasetModule } from "./types";

/**
 * Campus: departments own students, instructors and courses; courses run as
 * sections per semester; enrolments and attendance are the many-to-many
 * bridges. `student_attendance.student_id` is the first lesson's target.
 */
const university: DatasetModule = {
  sql: `
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    building VARCHAR(100)
);

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    date_of_birth DATE,
    admission_year INTEGER
);

CREATE TABLE instructors (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    hire_date DATE
);

CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    credits INTEGER NOT NULL
);

CREATE TABLE semesters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    year INTEGER,
    start_date DATE,
    end_date DATE
);

CREATE TABLE course_sections (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    instructor_id INTEGER REFERENCES instructors(id),
    semester_id INTEGER REFERENCES semesters(id),
    room VARCHAR(50),
    capacity INTEGER
);

CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    section_id INTEGER REFERENCES course_sections(id),
    enrollment_date DATE,
    grade VARCHAR(5),
    marks DECIMAL(5, 2)
);

CREATE TABLE student_attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    section_id INTEGER REFERENCES course_sections(id),
    class_date DATE,
    present BOOLEAN
);

INSERT INTO departments (id, name, building)
SELECT g,
  (ARRAY['Computer Science','Electrical Engineering','Mathematics','Physics','Business',
         'Economics','Textile Engineering','Architecture','Pharmacy','Law'])[g],
  'Building ' || CHR(64 + g)
FROM generate_series(1, 10) AS g;

INSERT INTO students (id, department_id, name, email, date_of_birth, admission_year)
SELECT g,
  1 + (g % 10),
  'Student ' || g,
  'student' || g || '@campus.edu',
  DATE '2000-01-01' + ((g * 37) % 2200),
  2019 + (g % 6)
FROM generate_series(1, 3000) AS g;

INSERT INTO instructors (id, department_id, name, email, hire_date)
SELECT g,
  1 + (g % 10),
  'Instructor ' || g,
  'instructor' || g || '@campus.edu',
  DATE '2012-01-01' + ((g * 53) % 3800)
FROM generate_series(1, 200) AS g;

INSERT INTO courses (id, department_id, code, name, credits)
SELECT g,
  1 + (g % 10),
  (ARRAY['CSE','EEE','MAT','PHY','BUS','ECO','TEX','ARC','PHA','LAW'])[1 + (g % 10)]
    || LPAD((100 + g)::text, 4, '0'),
  'Course ' || g,
  (ARRAY[1,2,3,3,3,4])[1 + (g % 6)]
FROM generate_series(1, 120) AS g;

INSERT INTO semesters (id, name, year, start_date, end_date)
SELECT g,
  (ARRAY['Spring','Summer','Fall','Winter'])[1 + (g % 4)],
  2024 + (g / 4),
  DATE '2024-01-01' + (g * 120),
  DATE '2024-01-01' + (g * 120) + 100
FROM generate_series(1, 8) AS g;

INSERT INTO course_sections (id, course_id, instructor_id, semester_id, room, capacity)
SELECT g,
  1 + (g % 120),
  1 + (g % 200),
  1 + (g % 8),
  'Room ' || (100 + (g % 60)),
  (ARRAY[20,25,30,40,60])[1 + (g % 5)]
FROM generate_series(1, 600) AS g;

INSERT INTO enrollments (id, student_id, section_id, enrollment_date, grade, marks)
SELECT g,
  1 + (g * 7) % 3000,
  1 + (g % 600),
  DATE '2024-01-15' + ((g % 8) * 120),
  CASE
    WHEN (40 + (g * 17) % 60) >= 90 THEN 'A+'
    WHEN (40 + (g * 17) % 60) >= 80 THEN 'A'
    WHEN (40 + (g * 17) % 60) >= 70 THEN 'B'
    WHEN (40 + (g * 17) % 60) >= 60 THEN 'C'
    WHEN (40 + (g * 17) % 60) >= 50 THEN 'D'
    ELSE 'F'
  END,
  ((4000 + (g * 1700) % 6000)::numeric / 100)
FROM generate_series(1, 12000) AS g;

-- Roughly one class day in seven is a no-show.
INSERT INTO student_attendance (id, student_id, section_id, class_date, present)
SELECT g,
  1 + (g * 13) % 3000,
  1 + (g % 600),
  DATE '2024-02-01' + ((g * 3) % 500),
  (g % 7) <> 0
FROM generate_series(1, 25000) AS g;
`,
  snippets: [
    {
      label: "1. Attendance for one student",
      hint: "student_attendance.student_id has no index — 25k rows scanned for ~8",
      sql: `SELECT class_date, section_id, present
FROM student_attendance
WHERE student_id = 1500
ORDER BY class_date;`,
    },
    {
      label: "2. Add the index",
      hint: "Re-run query 1 and compare the plan",
      sql: `CREATE INDEX idx_attendance_student
  ON student_attendance (student_id);

ANALYZE student_attendance;`,
    },
    {
      label: "3. Weighted GPA per student",
      hint: "Credits weight the average — join through sections to courses",
      sql: `SELECT s.name,
       d.name                                              AS department,
       SUM(c.credits)                                      AS credits,
       ROUND(SUM(e.marks * c.credits) / SUM(c.credits), 2)  AS weighted_avg
FROM enrollments e
JOIN students        s  ON s.id = e.student_id
JOIN departments     d  ON d.id = s.department_id
JOIN course_sections cs ON cs.id = e.section_id
JOIN courses         c  ON c.id = cs.course_id
GROUP BY s.id, s.name, d.name
HAVING SUM(c.credits) > 6
ORDER BY weighted_avg DESC
LIMIT 25;`,
    },
    {
      label: "4. Over-enrolled sections",
      hint: "HAVING compares a grouped count against the section's own capacity",
      sql: `SELECT c.code, c.name, cs.room, cs.capacity,
       COUNT(e.id) AS enrolled
FROM course_sections cs
JOIN courses     c ON c.id = cs.course_id
LEFT JOIN enrollments e ON e.section_id = cs.id
GROUP BY cs.id, c.code, c.name, cs.room, cs.capacity
HAVING COUNT(e.id) > cs.capacity
ORDER BY COUNT(e.id) - cs.capacity DESC
LIMIT 25;`,
    },
    {
      label: "5. Attendance rate by section",
      hint: "Averaging a boolean — count the trues, divide by the total",
      sql: `SELECT c.code, i.name AS instructor,
       COUNT(*)                                                     AS classes,
       ROUND(100.0 * COUNT(*) FILTER (WHERE a.present) / COUNT(*), 1) AS pct_present
FROM student_attendance a
JOIN course_sections cs ON cs.id = a.section_id
JOIN courses         c  ON c.id = cs.course_id
JOIN instructors     i  ON i.id = cs.instructor_id
GROUP BY c.code, i.name
ORDER BY pct_present
LIMIT 25;`,
    },
    {
      label: "6. Failing but present (CTE)",
      hint: "Two CTEs joined — students who showed up yet still failed",
      sql: `WITH attendance AS (
  SELECT student_id,
         100.0 * COUNT(*) FILTER (WHERE present) / COUNT(*) AS pct
  FROM student_attendance
  GROUP BY student_id
),
results AS (
  SELECT student_id, ROUND(AVG(marks), 2) AS avg_marks
  FROM enrollments
  GROUP BY student_id
)
SELECT s.name, ROUND(a.pct, 1) AS pct_present, r.avg_marks
FROM results r
JOIN attendance a ON a.student_id = r.student_id
JOIN students   s ON s.id = r.student_id
WHERE r.avg_marks < 55 AND a.pct > 80
ORDER BY r.avg_marks
LIMIT 25;`,
    },
  ],
};

export default university;
