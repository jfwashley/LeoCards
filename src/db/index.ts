import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Uses process.env.DATABASE_URL directly (not env.ts) because this file
// is imported by auth.ts at module scope before the env validation runs.
// biome-ignore lint/style/noNonNullAssertion: DATABASE_URL is validated at runtime by env.ts; direct access required to avoid circular import
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });
