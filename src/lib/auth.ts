import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { EMAIL_FROM } from "@/lib/account-constants";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema, // MUST pass full schema — passing a subset causes runtime error
  }),
  user: {
    additionalFields: {
      nativeLanguage: {
        type: "string",
        required: false,
        defaultValue: "en",
        input: true,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // Import Resend inside the function to avoid top-level side effects
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      resend.emails
        .send({
          from: EMAIL_FROM,
          to: user.email,
          subject: "Reset your LeoCards password",
          text: `Reset your password: ${url}`,
        })
        .catch((err) => {
          console.error("[auth] Failed to send password reset email:", err);
        });
    },
    revokeSessionsOnPasswordReset: true,
  },
  session: {
    // Because `database` (drizzleAdapter) is set above, better-auth's
    // DB-less auto-default for cookieCache does NOT fire — this block
    // must be explicit. 5-minute TTL (D-03); default "compact" strategy
    // is HMAC-SHA256-signed, no encryption needed for this non-sensitive
    // payload. /account + its 2 mutation server actions bypass this via
    // getSessionFresh (D-04) — see src/lib/auth-session.ts.
    cookieCache: {
      enabled: true,
      maxAge: 300,
    },
  },
  plugins: [nextCookies()], // MUST be last plugin in array
});
