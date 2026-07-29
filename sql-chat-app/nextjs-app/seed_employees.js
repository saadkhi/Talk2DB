/**
 * seed_employees.js
 * Creates and seeds an `employees` table in the Neon database for testing.
 * Run once: node seed_employees.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_XBEcV8OTJ3nH@ep-soft-scene-anwuoqex.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Creating employees table...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      department VARCHAR(100) NOT NULL,
      position   VARCHAR(100) NOT NULL,
      salary     NUMERIC(10, 2) NOT NULL,
      hire_date  DATE NOT NULL
    )
  `);

  // Clear any existing rows so we can re-run safely
  await pool.query('DELETE FROM employees');

  console.log('Seeding employee rows...');

  await pool.query(`
    INSERT INTO employees (name, department, position, salary, hire_date) VALUES
      ('Alice Johnson',   'HR',          'HR Specialist',       45000.00, '2021-03-15'),
      ('Bob Martinez',    'Support',     'Support Agent',       38000.00, '2020-06-01'),
      ('Carol Smith',     'Operations',  'Ops Coordinator',     52000.00, '2019-11-20'),
      ('David Lee',       'Finance',     'Finance Analyst',     59000.00, '2022-01-10'),
      ('Eva Brown',       'Marketing',   'Marketing Exec',      41500.00, '2021-08-05'),
      ('Frank Wilson',    'Engineering', 'Software Engineer',   85000.00, '2018-04-22'),
      ('Grace Taylor',    'Engineering', 'Senior Engineer',     110000.00,'2017-09-30'),
      ('Henry Adams',     'Sales',       'Sales Manager',       72000.00, '2019-02-14'),
      ('Isabella Moore',  'Design',      'UI Designer',         55000.00, '2023-03-01'),
      ('James Clark',     'HR',          'HR Manager',          68000.00, '2016-07-19'),
      ('Karen White',     'Support',     'Support Lead',        48000.00, '2020-12-11'),
      ('Liam Harris',     'Finance',     'Junior Accountant',   37500.00, '2023-06-15'),
      ('Mia Lewis',       'Marketing',   'Content Writer',      43000.00, '2022-09-08'),
      ('Noah Robinson',   'Engineering', 'Backend Engineer',    95000.00, '2019-05-27'),
      ('Olivia Walker',   'Sales',       'Sales Rep',           46000.00, '2021-10-03'),
      ('Paul Hall',       'Operations',  'Logistics Officer',   51000.00, '2020-03-22'),
      ('Quinn Young',     'Design',      'Graphic Designer',    39000.00, '2023-01-17'),
      ('Rachel King',     'Engineering', 'DevOps Engineer',     98000.00, '2018-11-05'),
      ('Samuel Wright',   'Finance',     'CFO',                 150000.00,'2015-01-01'),
      ('Tina Scott',      'HR',          'Recruiter',           42000.00, '2022-04-28')
  `);

  // Verify
  const total = await pool.query('SELECT COUNT(*) FROM employees');
  const under60k = await pool.query('SELECT COUNT(*) FROM employees WHERE salary < 60000');
  const rows = await pool.query('SELECT id, name, department, salary FROM employees WHERE salary < 60000 ORDER BY salary ASC');

  console.log('\n=== Seed complete ===');
  console.log('Total employees:', total.rows[0].count);
  console.log('Employees with salary < 60000:', under60k.rows[0].count);
  console.log('\nEmployees with salary < 60000:');
  rows.rows.forEach(r => {
    console.log(`  [id=${r.id}] ${r.name} (${r.department}) — $${r.salary}`);
  });

  await pool.end();
}

main().catch(e => {
  console.error('SEED ERROR:', e.message);
  process.exit(1);
});
