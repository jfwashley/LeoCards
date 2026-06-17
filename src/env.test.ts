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

describe("STUDY_COOLDOWN_MINUTES env var coercion", () => {
  function buildEnvWithCooldownMinutes(value: string | undefined) {
    return createEnv({
      server: {
        DATABASE_URL: z.url(),
        BETTER_AUTH_SECRET: z.string().min(32),
        STUDY_COOLDOWN_MINUTES: z
          .string()
          .optional()
          .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
          .pipe(z.number().int().min(1).optional()),
      },
      client: {},
      runtimeEnv: {
        DATABASE_URL: "postgresql://user:pass@host/db?sslmode=require",
        BETTER_AUTH_SECRET: "a-very-long-secret-that-is-32-chars-long!",
        STUDY_COOLDOWN_MINUTES: value,
      },
      emptyStringAsUndefined: true,
    });
  }

  it("STUDY_COOLDOWN_MINUTES='15' coerces to the number 15", () => {
    const env = buildEnvWithCooldownMinutes("15");
    expect(env.STUDY_COOLDOWN_MINUTES).toBe(15);
    expect(typeof env.STUDY_COOLDOWN_MINUTES).toBe("number");
  });

  it("STUDY_COOLDOWN_MINUTES='' is treated as undefined (emptyStringAsUndefined)", () => {
    const env = buildEnvWithCooldownMinutes("");
    expect(env.STUDY_COOLDOWN_MINUTES).toBeUndefined();
  });

  it("STUDY_COOLDOWN_MINUTES='0' fails schema validation (min 1)", () => {
    expect(() => buildEnvWithCooldownMinutes("0")).toThrow();
  });

  it("STUDY_COOLDOWN_MINUTES='-5' fails schema validation (negative)", () => {
    expect(() => buildEnvWithCooldownMinutes("-5")).toThrow();
  });

  it("STUDY_COOLDOWN_MINUTES=undefined yields undefined", () => {
    const env = buildEnvWithCooldownMinutes(undefined);
    expect(env.STUDY_COOLDOWN_MINUTES).toBeUndefined();
  });
});
