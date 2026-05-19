// Global test setup — runs before every test file.
// Sets a dummy DATABASE_URL so neon() does not throw on module import
// when tests import components that transitively import src/db/index.ts.
// The actual DB is always mocked in tests that need it (vi.mock("@/db")).
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/test_db";
}
