#!/usr/bin/env node
// scripts/cleanup-test-users.mjs — one-off housekeeping.
// Deletes throwaway CWV/measurement users (email LIKE '%@leocards-test.local').
// All user dependents (session, account, decks→cards→recall_events,
// milestones_seen, habitat_metadata) are ON DELETE CASCADE, so deleting the
// `user` rows is sufficient.
//
// Usage: CLEANUP_DB_URL="postgres://..." node scripts/cleanup-test-users.mjs

import { neon } from "@neondatabase/serverless";

const url = process.env.CLEANUP_DB_URL;
if (!url) {
  console.error("FATAL: set CLEANUP_DB_URL");
  process.exit(1);
}

const sql = neon(url);
const PATTERN = "%@leocards-test.local";

const found = await sql`SELECT id, email FROM "user" WHERE email LIKE ${PATTERN} ORDER BY email`;
console.log(`[cleanup] matched ${found.length} test user(s):`);
for (const r of found) console.log(`  - ${r.email}`);

if (found.length === 0) {
  console.log("[cleanup] nothing to delete.");
  process.exit(0);
}

const deleted = await sql`DELETE FROM "user" WHERE email LIKE ${PATTERN} RETURNING email`;
console.log(`[cleanup] deleted ${deleted.length} user(s) (+ cascaded sessions/accounts/decks/cards/recall_events/milestones/habitat_metadata).`);
