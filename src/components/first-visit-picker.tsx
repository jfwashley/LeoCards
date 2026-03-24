"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createDeck } from "@/lib/deck-actions";

const ALL_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
];

interface FirstVisitPickerProps {
  nativeLang: string;
}

export function FirstVisitPicker({ nativeLang }: FirstVisitPickerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const languages = ALL_LANGUAGES.filter((l) => l.code !== nativeLang);

  async function handleSelect(langCode: string) {
    setLoading(langCode);
    setError(null);
    try {
      await createDeck(langCode);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full mx-auto rounded-xl shadow-sm bg-popover p-6 flex flex-col items-center gap-4">
        <span className="text-4xl">🐯</span>
        <h1 className="text-xl font-semibold text-center">
          What language do you want to learn?
        </h1>
        <div className="flex flex-col gap-3 w-full mt-2">
          {languages.map((lang) => (
            <Button
              key={lang.code}
              variant="outline"
              className="h-11 w-full text-base"
              disabled={loading !== null}
              onClick={() => handleSelect(lang.code)}
            >
              {loading === lang.code ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {lang.flag} {lang.label}
                </>
              )}
            </Button>
          ))}
        </div>
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
