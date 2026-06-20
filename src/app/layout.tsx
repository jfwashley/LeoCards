import "@/env";
import type { Metadata } from "next";
import { Baloo_2, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// Daybreak typography: Figtree (body) + Baloo 2 (display — headings, numbers, buttons).
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
});

const baloo2 = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "LeoCards",
  description: "Learn languages and grow Leo's world.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        figtree.variable,
        baloo2.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
