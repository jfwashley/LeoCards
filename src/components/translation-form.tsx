"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useReducer, useRef } from "react";
import { useDebouncedCallback as useDebounceCallback } from "use-debounce";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveCard } from "@/lib/deck-actions";

const TranslationResponseSchema = z.object({
  translation: z.string().min(1),
});

interface TranslationFormProps {
  deckId: string;
  nativeLang: string;
  targetLang: string;
  nativeLangLabel: string;
  targetLangLabel: string;
}

// Consolidated form state
interface FormState {
  nativeText: string;
  targetText: string;
  isTranslating: boolean;
  translationError: string | null;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
}

type FormAction =
  | { type: "SET_NATIVE"; text: string }
  | { type: "SET_TARGET"; text: string }
  | { type: "TRANSLATE_START" }
  | { type: "TRANSLATE_DONE"; field: "native" | "target"; text: string }
  | {
      type: "TRANSLATE_ERROR";
      message: string;
      clearField: "native" | "target";
    }
  | { type: "CLEAR_TRANSLATE_ERROR" }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS" }
  | { type: "SAVE_ERROR"; message: string }
  | { type: "CLEAR_SAVE_SUCCESS" };

const initialFormState: FormState = {
  nativeText: "",
  targetText: "",
  isTranslating: false,
  translationError: null,
  isSaving: false,
  saveSuccess: false,
  saveError: null,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_NATIVE":
      return { ...state, nativeText: action.text, translationError: null };
    case "SET_TARGET":
      return { ...state, targetText: action.text, translationError: null };
    case "TRANSLATE_START":
      return { ...state, isTranslating: true, translationError: null };
    case "TRANSLATE_DONE":
      return {
        ...state,
        isTranslating: false,
        [action.field === "native" ? "targetText" : "nativeText"]: action.text,
      };
    case "TRANSLATE_ERROR":
      return {
        ...state,
        isTranslating: false,
        translationError: action.message,
        [action.clearField === "native" ? "targetText" : "nativeText"]: "",
      };
    case "CLEAR_TRANSLATE_ERROR":
      return { ...state, translationError: null };
    case "SAVE_START":
      return { ...state, isSaving: true, saveError: null, saveSuccess: false };
    case "SAVE_SUCCESS":
      return {
        ...initialFormState,
        saveSuccess: true,
      };
    case "SAVE_ERROR":
      return { ...state, isSaving: false, saveError: action.message };
    case "CLEAR_SAVE_SUCCESS":
      return { ...state, saveSuccess: false };
    default:
      return state;
  }
}

export function TranslationForm({
  deckId,
  nativeLang,
  targetLang,
  nativeLangLabel,
  targetLangLabel,
}: TranslationFormProps) {
  const [state, dispatch] = useReducer(formReducer, initialFormState);
  const activeField = useRef<"native" | "target" | null>(null);

  const translateFrom = useCallback(
    async (text: string, direction: "native" | "target") => {
      if (!text.trim()) return;

      dispatch({ type: "TRANSLATE_START" });

      try {
        const [sourceLang, destLang] =
          direction === "native"
            ? [nativeLang, targetLang]
            : [targetLang, nativeLang];

        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, sourceLang, targetLang: destLang }),
        });

        if (!response.ok) {
          throw new Error("Translation failed");
        }

        const data = TranslationResponseSchema.parse(await response.json());

        if (activeField.current === direction) {
          dispatch({
            type: "TRANSLATE_DONE",
            field: direction,
            text: data.translation,
          });
        }
      } catch {
        if (activeField.current === direction) {
          dispatch({
            type: "TRANSLATE_ERROR",
            message: "Translation unavailable. Enter manually.",
            clearField: direction,
          });
        }
      }
    },
    [nativeLang, targetLang],
  );

  const debouncedTranslate = useDebounceCallback(translateFrom, 500);

  function handleNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    activeField.current = "native";
    dispatch({ type: "SET_NATIVE", text });
    debouncedTranslate(text, "native");
  }

  function handleTargetChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    activeField.current = "target";
    dispatch({ type: "SET_TARGET", text });
    debouncedTranslate(text, "target");
  }

  async function handleSave() {
    if (!state.nativeText.trim() || !state.targetText.trim()) return;

    dispatch({ type: "SAVE_START" });

    try {
      await saveCard(
        deckId,
        state.nativeText.trim(),
        state.targetText.trim(),
        "manual",
      );
      activeField.current = null;
      dispatch({ type: "SAVE_SUCCESS" });
      setTimeout(() => dispatch({ type: "CLEAR_SAVE_SUCCESS" }), 3000);
    } catch {
      dispatch({
        type: "SAVE_ERROR",
        message: "Couldn't save card. Try again.",
      });
    }
  }

  const isNativeReceiving =
    state.isTranslating && activeField.current === "target";
  const isTargetReceiving =
    state.isTranslating && activeField.current === "native";

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

      {/* Responsive translation grid — stacks on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Native language field */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="native-input">{nativeLangLabel}</Label>
          {isNativeReceiving ? (
            <div className="bg-muted animate-pulse rounded-md h-10 w-full" />
          ) : (
            <Input
              id="native-input"
              type="text"
              value={state.nativeText}
              onChange={handleNativeChange}
              placeholder={`Type in ${nativeLangLabel}…`}
              disabled={state.isSaving}
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
              value={state.targetText}
              onChange={handleTargetChange}
              placeholder={`Type in ${targetLangLabel}…`}
              disabled={state.isSaving}
            />
          )}
        </div>
      </div>

      {/* Translation error */}
      {state.translationError && (
        <p className="text-sm text-destructive mb-3">
          {state.translationError}
        </p>
      )}

      {/* Save button */}
      <Button
        className="w-full h-11"
        variant="default"
        disabled={
          !state.nativeText.trim() || !state.targetText.trim() || state.isSaving
        }
        onClick={handleSave}
      >
        {state.isSaving ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save card"
        )}
      </Button>

      {/* Save success message */}
      {state.saveSuccess && (
        <p className="text-sm text-green-600 mt-2">Card saved.</p>
      )}

      {/* Save error message */}
      {state.saveError && (
        <p className="text-sm text-destructive mt-2">{state.saveError}</p>
      )}
    </div>
  );
}
