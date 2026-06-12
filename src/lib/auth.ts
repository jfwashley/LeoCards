import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

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
          from: "LeoCards <noreply@leocards.com>",
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
  plugins: [nextCookies()], // MUST be last plugin in array
});
