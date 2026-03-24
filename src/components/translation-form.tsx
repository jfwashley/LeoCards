"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useDebounceCallback } from "use-debounce";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveCard } from "@/lib/deck-actions";

interface TranslationFormProps {
  deckId: string;
  nativeLang: string;
  targetLang: string;
  nativeLangLabel: string;
  targetLangLabel: string;
}

export function TranslationForm({
  deckId,
  nativeLang,
  targetLang,
  nativeLangLabel,
  targetLangLabel,
}: TranslationFormProps) {
  const [nativeText, setNativeText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Tracks which field the user last typed in — prevents feedback loop
  const activeField = useRef<"native" | "target" | null>(null);

  const translateFrom = useCallback(
    async (text: string, direction: "native" | "target") => {
      if (!text.trim()) return;

      setIsTranslating(true);
      setTranslationError(null);

      try {
        const [sourceLang, destLang] =
          direction === "native" ? [nativeLang, targetLang] : [targetLang, nativeLang];

        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, sourceLang, targetLang: destLang }),
        });

        if (!response.ok) {
          throw new Error("Translation failed");
        }

        const data = (await response.json()) as { translation: string };

        // Only update the other field if the user is still typing in the same field
        // that triggered this translation (prevents feedback loop)
        if (activeField.current === direction) {
          if (direction === "native") {
            setTargetText(data.translation);
          } else {
            setNativeText(data.translation);
          }
        }
      } catch {
        setTranslationError("Translation unavailable. Enter manually.");
        // Clear the receiving field on error
        if (activeField.current === direction) {
          if (direction === "native") {
            setTargetText("");
          } else {
            setNativeText("");
          }
        }
      } finally {
        setIsTranslating(false);
      }
    },
    [nativeLang, targetLang],
  );

  const debouncedTranslate = useDebounceCallback(translateFrom, 500);

  function handleNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    activeField.current = "native";
    setNativeText(text);
    setTranslationError(null);
    debouncedTranslate(text, "native");
  }

  function handleTargetChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    activeField.current = "target";
    setTargetText(text);
    setTranslationError(null);
    debouncedTranslate(text, "target");
  }

  async function handleSave() {
    if (!nativeText.trim() || !targetText.trim()) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await saveCard(deckId, nativeText.trim(), targetText.trim(), "manual");
      // Success — clear form and show feedback
      setNativeText("");
      setTargetText("");
      activeField.current = null;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Couldn't save card. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const isNativeReceiving = isTranslating && activeField.current === "target";
  const isTargetReceiving = isTranslating && activeField.current === "native";

  return (
    <div>
      {/* Back navigation */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline mb-4"
      >
        <ArrowLeft className="size-4" />
        Back to my deck
      </Link>

      {/* Page heading */}
      <h1 className="text-xl font-semibold mb-6">Add a Card</h1>

      {/* Two-column translation grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Native language field */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="native-input">{nativeLangLabel}</Label>
          {isNativeReceiving ? (
            <div className="bg-muted animate-pulse rounded-md h-10 w-full" />
          ) : (
            <Input
              id="native-input"
              type="text"
              value={nativeText}
              onChange={handleNativeChange}
              placeholder={`Type in ${nativeLangLabel}…`}
              disabled={isSaving}
            />
          )}
        </div>

        {/* Target language field */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-input">{targetLangLabel}</Label>
          {isTargetReceiving ? (
            <div className="bg-muted animate-pulse rounded-md h-10 w-full" />
          ) : (
            <Input
              id="target-input"
              type="text"
              value={targetText}
              onChange={handleTargetChange}
              placeholder={`Type in ${targetLangLabel}…`}
              disabled={isSaving}
            />
          )}
        </div>
      </div>

      {/* Translation error */}
      {translationError && (
        <p className="text-sm text-destructive mb-3">{translationError}</p>
      )}

      {/* Save button */}
      <Button
        className="w-full h-11"
        variant="default"
        disabled={!nativeText.trim() || !targetText.trim() || isSaving}
        onClick={handleSave}
      >
        {isSaving ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save card"
        )}
      </Button>

      {/* Save success message */}
      {saveSuccess && (
        <p className="text-sm text-green-600 mt-2">Card saved.</p>
      )}

      {/* Save error message */}
      {saveError && (
        <p className="text-sm text-destructive mt-2">{saveError}</p>
      )}
    </div>
  );
}
