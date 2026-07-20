import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Uses process.env.DATABASE_URL directly (not env.ts) because this file
// is imported by auth.ts at module scope before the env validation runs.

// Neon HTTP driver (@neondatabase/serverless + drizzle-orm/neon-http):
// Uses stateless HTTP queries, not a persistent connection pool.
// Each request opens a one-shot HTTPS connection to Neon's SQL proxy.
// No pool configuration is needed or possible — the driver manages
// connection lifecycle per-query. This is ideal for serverless/edge
// environments where persistent TCP connections cannot be maintained.
//
// Phase 17 nav profiling: the driver's HTTP queries ride Node fetch
// (undici), whose default agent drops idle sockets after ~4s — so any
// user pause longer than that (e.g. a study session) makes the next
// query burst pay fresh TCP+TLS handshakes to Neon (+~400ms measured on
// the post-study dashboard render). A dedicated dispatcher with a longer
// keep-alive keeps sockets warm across normal pauses. Node runtime only:
// undici is a transitive dep of the Node server bundle; edge/browser
// runtimes lack it and fall back to driver defaults via the catch.
let fetchOptions: Record<string, unknown> | undefined;
try {
  const { Agent } = require("undici") as typeof import("undici");
  fetchOptions = {
    dispatcher: new Agent({
      keepAliveTimeout: 60_000,
      keepAliveMaxTimeout: 60_000,
    }),
  };
} catch {
  fetchOptions = undefined;
}

// biome-ignore lint/style/noNonNullAssertion: DATABASE_URL is validated at runtime by env.ts; direct access required to avoid circular import
const sql = neon(process.env.DATABASE_URL!, { fetchOptions });
export const db = drizzle({ client: sql, schema });
