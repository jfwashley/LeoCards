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
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // Import Resend inside the function to avoid top-level side effects
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      // void to prevent timing attacks
      void resend.emails.send({
        from: "TioCards <noreply@tiocards.com>",
        to: user.email,
        subject: "Reset your TioCards password",
        text: `Reset your password: ${url}`,
      });
    },
    revokeSessionsOnPasswordReset: true,
  },
  plugins: [nextCookies()], // MUST be last plugin in array
});
