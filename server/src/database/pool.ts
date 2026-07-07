import { Pool } from "pg";
import { env } from "../config/env.js";

// Single shared Postgres connection pool with retry configuration
export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  
  // Connection pool settings
  max: 20, // Maximum number of connections in the pool
  min: 5, // Keep at least 5 connections alive to avoid cold starts
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Wait up to 5 seconds for a connection
  
  // SSL is required for Supabase and improves connection stability/speed when handled correctly by the driver
  ssl: {
    rejectUnauthorized: false
  },

  // Retry settings for DNS and connection issues
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

export async function pingDatabase(): Promise<void> {
  const start = Date.now();
  await pool.query("SELECT 1");
  const duration = Date.now() - start;
  if (duration > 500) {
    console.warn(`[DB] Ping took ${duration}ms - Possible slow connection to Supabase`);
  }
}




