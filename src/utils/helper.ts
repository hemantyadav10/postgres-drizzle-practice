import { sql, type SQL, type Table } from "drizzle-orm";
import { db } from "../db/index.js";

/**
 * Checks whether at least one row exists in the given table that matches the specified conditions.
 *
 * Uses PostgreSQL `EXISTS` for an efficient short-circuit query (stops scanning as soon as a match is found).
 *
 * @param table - Drizzle table reference to query against
 * @param conditions - SQL conditions to apply in the WHERE clause (Drizzle SQL fragment)
 * @returns A boolean indicating whether a matching record exists
 *
 * @example
 * const exists = await recordExists(users, eq(users.email, email));
 * if (exists) {
 *   throw new Error("User already exists");
 * }
 */
async function recordExists(table: Table, conditions: SQL): Promise<boolean> {
  const res = await db.execute(sql`
    SELECT EXISTS(
      SELECT 1 FROM ${table} 
      WHERE ${conditions}
    ) AS "exists"`);

  const result = res.rows[0]?.["exists"];

  return typeof result === "boolean" ? result : false;
}

export { recordExists };
