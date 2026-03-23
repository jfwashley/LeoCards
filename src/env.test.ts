import { createEnv } from "@t3-oss/env-nextjs";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("env validation", () => {
  it("throws when required server vars are missing", () => {
    expect(() => {
      createEnv({
        server: {
          DATABASE_URL: z.url(),
          BETTER_AUTH_SECRET: z.string().min(32),
          RESEND_API_KEY: z.string().min(1),
        },
        client: {
          NEXT_PUBLIC_APP_URL: z.url(),
        },
        runtimeEnv: {
          DATABASE_URL: undefined,
          BETTER_AUTH_SECRET: undefined,
          RESEND_API_KEY: undefined,
          NEXT_PUBLIC_APP_URL: undefined,
        },
      });
    }).toThrow();
  });

  it("does not throw when all required vars are provided", () => {
    expect(() => {
      createEnv({
        server: {
          DATABASE_URL: z.url(),
          BETTER_AUTH_SECRET: z.string().min(32),
          RESEND_API_KEY: z.string().min(1),
        },
        client: {
          NEXT_PUBLIC_APP_URL: z.url(),
        },
        runtimeEnv: {
          DATABASE_URL: "postgresql://user:pass@host/db?sslmode=require",
          BETTER_AUTH_SECRET: "a-very-long-secret-that-is-32-chars-long!",
          RESEND_API_KEY: "re_test_key",
          NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        },
      });
    }).not.toThrow();
  });
});
