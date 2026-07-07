const { Pool } = require('pg');
require('dotenv').config();

// Single shared Postgres connection pool with retry configuration
const pool = new Pool({
  host:     process.env.DB_HOST?.trim(),
  port:     parseInt(process.env.DB_PORT?.trim() || '5432', 10),
  user:     process.env.DB_USER?.trim(),
  password: process.env.DB_PASSWORD?.trim(),
  database: process.env.DB_NAME?.trim(),

  // Connection pool settings
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // SSL required for Supabase
  ssl: { rejectUnauthorized: false },

  // Keep-alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

async function pingDatabase() {
  const start = Date.now();
  await pool.query('SELECT 1');
  const duration = Date.now() - start;
  if (duration > 500) {
    console.warn(`[DB] Ping took ${duration}ms – possible slow Supabase connection`);
  }

  // Auto-initialize tables in PostgreSQL if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      nationality VARCHAR(100) NOT NULL,
      destination VARCHAR(50) NOT NULL,
      visa_type VARCHAR(50) NOT NULL,
      timeline VARCHAR(50) NOT NULL,
      knows_pof_amount VARCHAR(10) NOT NULL,
      pof_amount VARCHAR(200),
      letters_received TEXT,
      access_to_funds VARCHAR(50) NOT NULL,
      applying_within_30_days VARCHAR(10) NOT NULL,
      prior_refusal VARCHAR(10) NOT NULL,
      heard_from VARCHAR(50) NOT NULL,
      additional_info TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      notes TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      summary TEXT,
      priority VARCHAR(10) DEFAULT 'medium',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure columns exist on existing databases
  await pool.query(`
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS knows_pof_amount VARCHAR(10);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS pof_amount VARCHAR(200);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS letters_received TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS access_to_funds VARCHAR(50);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS applying_within_30_days VARCHAR(10);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS prior_refusal VARCHAR(10);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS heard_from VARCHAR(50);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS additional_info TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS summary TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS score INT DEFAULT 0;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_agent TEXT;
  `);


  // Create bookings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id           SERIAL PRIMARY KEY,
      submission_id INT REFERENCES submissions(id) ON DELETE SET NULL,
      full_name    VARCHAR(100) NOT NULL,
      email        VARCHAR(100) NOT NULL,
      phone        VARCHAR(20)  NOT NULL,
      booked_date  DATE         NOT NULL,
      booked_time  VARCHAR(10)  NOT NULL,
      status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
      notes        TEXT,
      created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(booked_date, booked_time)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS borderlessbridgeheart (
      id INT PRIMARY KEY,
      last_ping TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      counter INT DEFAULT 0
    );
  `);

  // Ensure row 1 exists in borderlessbridgeheart
  await pool.query(`
    INSERT INTO borderlessbridgeheart (id, last_ping, counter)
    VALUES (1, CURRENT_TIMESTAMP, 0)
    ON CONFLICT (id) DO NOTHING;
  `);
}

module.exports = { pool, pingDatabase };
