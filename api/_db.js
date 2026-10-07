import { sql } from '@vercel/postgres';
import { Pool } from 'pg';

let fallbackPool = null;

export async function query(text, params = []) {
  // If @vercel/postgres has POSTGRES_URL configured directly
  if (process.env.POSTGRES_URL && !process.env.POSTGRES_URL.includes('[SENSITIVE]')) {
    try {
      const client = await sql.connect();
      try {
        return await client.query(text, params);
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn("Vercel SQL connect fallback to standard pg Pool:", err.message);
    }
  }

  // Fallback using pg Pool with DATABASE_URL or POSTGRES_URL
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL;
  if (!fallbackPool && connectionString && !connectionString.includes('[SENSITIVE]')) {
    fallbackPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }

  if (fallbackPool) {
    return await fallbackPool.query(text, params);
  }

  throw new Error("Veritabanı bağlantı adresi (POSTGRES_URL / DATABASE_URL) bulunamadı veya henüz yapılandırılmadı.");
}

export async function initDb() {
  // 1. Users Table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      farm_name VARCHAR(255),
      full_name VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. User Feeds Table (Custom or modified feed values per user)
  await query(`
    CREATE TABLE IF NOT EXISTS user_feeds (
      id VARCHAR(100) NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      dm NUMERIC,
      cp NUMERIC,
      nel NUMERIC,
      nem NUMERIC,
      neg NUMERIC,
      me NUMERIC,
      ndf NUMERIC,
      ca NUMERIC,
      p NUMERIC,
      price NUMERIC,
      is_roughage BOOLEAN DEFAULT false,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, id)
    );
  `);

  // 3. User Rations & Paddocks Table
  await query(`
    CREATE TABLE IF NOT EXISTS user_rations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      paddock_name VARCHAR(255) NOT NULL,
      head_count INTEGER DEFAULT 1,
      weight NUMERIC DEFAULT 400,
      target_adg NUMERIC DEFAULT 1.4,
      breed_id VARCHAR(100),
      period_id VARCHAR(100),
      amounts_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
