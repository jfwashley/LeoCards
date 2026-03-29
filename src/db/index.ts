import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Uses process.env.DATABASE_URL directly (not env.ts) because this file
// is imported by auth.ts at module scope before the env validation runs.
// biome-ignore lint/style/noNonNullAssertion: DATABASE_URL is validated at runtime by env.ts; direct access required to avoid circular import

// Neon HTTP driver (@neondatabase/serverless + drizzle-orm/neon-http):
// Uses stateless HTTP queries, not a persistent connection pool.
// Each request opens a one-shot HTTPS connection to Neon's SQL proxy.
// No pool configuration is needed or possible — the driver manages
// connection lifecycle per-query. This is ideal for serverless/edge
// environments where persistent TCP connections cannot be maintained.
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });
