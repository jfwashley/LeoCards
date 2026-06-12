#!/usr/bin/env node
// scripts/cleanup-test-users.mjs — one-off housekeeping.
// Deletes throwaway CWV/measurement users (email LIKE '%@leocards-test.local').
// All user dependents (session, account, decks→cards→recall_events,
// milestones_seen, habitat_metadata) are ON DELETE CASCADE, so deleting the
// `user` rows is sufficient.
//
// Usage: CLEANUP_DB_URL="postgres://..." node scripts/cleanup-test-users.mjs [pattern]
//   pattern defaults to %@leocards-test.local; pass "%@test.local" for e2e users.
//   Guard: pattern must end in a *test.local domain — real users are unreachable.

import { neon } from "@neondatabase/serverless";

const url = process.env.CLEANUP_DB_URL;
if (!url) {
  console.error("FATAL: set CLEANUP_DB_URL");
  process.exit(1);
}

const sql = neon(url);
const PATTERN = process.argv[2] ?? "%@leocards-test.local";
if (!/@(leocards-)?test\.local$/.test(PATTERN)) {
  console.error(`FATAL: refusing pattern "${PATTERN}" — must target a *test.local domain`);
  process.exit(1);
}

const found = await sql`SELECT id, email FROM "user" WHERE email LIKE ${PATTERN} ORDER BY email`;
console.log(`[cleanup] matched ${found.length} test user(s):`);
for (const r of found) console.log(`  - ${r.email}`);

if (found.length === 0) {
  console.log("[cleanup] nothing to delete.");
  process.exit(0);
}

const deleted = await sql`DELETE FROM "user" WHERE email LIKE ${PATTERN} RETURNING email`;
console.log(`[cleanup] deleted ${deleted.length} user(s) (+ cascaded sessions/accounts/decks/cards/recall_events/milestones/habitat_metadata).`);
