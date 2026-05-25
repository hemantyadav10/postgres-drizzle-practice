import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import * as schema from "./schema.js";

export const pool = new Pool({
  connectionString: env.DB_URL,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle({
  client: pool,
  schema,
  logger: env.NODE_ENV === "development",
});

export async function testDbConnection(): Promise<void> {
  try {
    await pool.query("SELECT 1");
    logger.info("Connected to PostgreSQL");
  } catch (error) {
    logger.fatal({ err: error }, "Failed to connect to the database");
    throw error;
  }
}
