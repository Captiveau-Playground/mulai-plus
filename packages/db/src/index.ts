import { env } from "@better-auth-admin/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";

const { Pool } = pg;

// Use a connection pool to maintain persistent connections
// This reduces the overhead of establishing new connections and DNS lookups
// which helps prevent "DNSException: getaddrinfo ETIMEOUT" errors
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
});

export const db = drizzle(pool, { schema });
export * from "drizzle-orm";
export { schema };
