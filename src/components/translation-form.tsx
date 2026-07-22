"use client";

import { useCallback, useReducer, useRef } from "react";
import { useDebouncedCallback as useDebounceCallback } from "use-debounce";
import { z } from "zod";
import { ACBanner } from "@/components/daybreak/ac-banner";
import { ACBtn } from "@/components/daybreak/ac-btn";
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

// Consolidated form state — PRESERVED (behavior-only, untouched)
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

// Inline ACField-style field: label + input + pending shimmer + error state
// Follows the d1 token convention (inline hex, no Tailwind in atoms).
function ACField({
  id,
  label,
  value,
  placeholder,
  disabled,
  pending,
  hasValue,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  pending?: boolean;
  hasValue?: boolean;
  error?: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const borderColor = error ? "#DE5F4A" : hasValue ? "#F28A1F" : "#EDDFC9";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 13, fontWeight: 700, color: "#4A331C" }}
      >
        {label}
      </label>
      {pending ? (
        /* Translating shimmer state: amber wash + pulsing bar + label */
        <div
          style={{
            minHeight: 52,
            borderRadius: 12,
            border: "1.5px solid #F0E3CF",
            background: "#FFF8EC",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 6,
            padding: "10px 13px",
            boxSizing: "border-box",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "#F28A1F" }}>
            Translating…
          </span>
          <div
            style={{
              height: 10,
              width: "62%",
              borderRadius: 6,
              background: "#F0D9A8",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            height: 52,
            borderRadius: 12,
            border: `1.5px solid ${borderColor}`,
            background: "#FFFBF4",
            padding: "0 13px",
            fontSize: 16,
            color: "#4A331C",
            boxSizing: "border-box",
            width: "100%",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      )}
      {error && (
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#DE5F4A" }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ACLinkBadge: swap disc between the two fields (swaps values + re-triggers translate)
function ACLinkBadge({ onClick }: { onClick: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 0",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label="Swap fields"
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "#FFF1DC",
          border: "1.5px solid #F0E3CF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 16,
          color: "#F28A1F",
          boxSizing: "border-box",
        }}
      >
        ⇅
      </button>
    </div>
  );
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
  // PERF-19: single AbortController ref — only one field is realistically
  // being typed into at a time, so aborting the previous in-flight request
  // whenever a new one fires is sufficient to kill a stale, slower response
  // before it can land. This COMPOSES with (does not replace) the
  // `activeField` guard below, which protects a different race (field switch).
  const translateAbortRef = useRef<AbortController | null>(null);

  const translateFrom = useCallback(
    async (text: string, direction: "native" | "target") => {
      if (!text.trim()) return;

      // Kill any previous in-flight translation before starting a new one.
      translateAbortRef.current?.abort();
      const controller = new AbortController();
      translateAbortRef.current = controller;

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
          signal: controller.signal,
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
      } catch (err) {
        // A superseded request was aborted — silent no-op, never a
        // user-visible error (Pitfall 4). Checked via duck-typed `.name`
        // (not `instanceof Error`) since a DOMException doesn't always
        // share a realm/prototype chain with the ambient `Error`.
        if (
          err !== null &&
          typeof err === "object" &&
          "name" in err &&
          err.name === "AbortError"
        ) {
          return;
        }
        if (activeField.current === direction) {
          dispatch({
            type: "TRANSLATE_ERROR",
            message: "Translation unavailable — enter manually.",
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

  function handleSwap() {
    // Wire the swap to existing SET_NATIVE / SET_TARGET actions — no new reducer actions.
    const prevNative = state.nativeText;
    const prevTarget = state.targetText;
    dispatch({ type: "SET_NATIVE", text: prevTarget });
    dispatch({ type: "SET_TARGET", text: prevNative });
    // Re-trigger translate from whichever field now has content
    if (prevTarget.trim()) {
      activeField.current = "native";
      debouncedTranslate(prevTarget, "native");
    } else if (prevNative.trim()) {
      activeField.current = "target";
      debouncedTranslate(prevNative, "target");
    }
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

  const canSave = !(
    !state.nativeText.trim() ||
    !state.targetText.trim() ||
    state.isSaving
  );

  // Determine which field shows the translation error
  // If the native field received an error (activeField was "native" when error fired), show on target
  // The error always shows on the field that was supposed to receive the translation
  const nativeError =
    state.translationError && activeField.current === "target"
      ? state.translationError
      : null;
  const targetError =
    state.translationError && activeField.current === "native"
      ? state.translationError
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Save success banner — shown ABOVE the fields (D-01: banner-moves-above-fields) */}
      {state.saveSuccess && (
        <ACBanner kind="ok">Card saved — add another.</ACBanner>
      )}

      {/* Save error banner */}
      {state.saveError && <ACBanner kind="error">{state.saveError}</ACBanner>}

      {/* Native language field (FIRST — D-01 native-first orientation) */}
      <ACField
        id="native-input"
        label={nativeLangLabel}
        value={state.nativeText}
        placeholder={`Type in ${nativeLangLabel}…`}
        disabled={state.isSaving}
        pending={isNativeReceiving}
        hasValue={state.nativeText.length > 0}
        error={nativeError}
        onChange={handleNativeChange}
      />

      {/* ACLinkBadge swap control between fields */}
      <ACLinkBadge onClick={handleSwap} />

      {/* Target language field (SECOND — D-01 native-first) */}
      <ACField
        id="target-input"
        label={targetLangLabel}
        value={state.targetText}
        placeholder={`Type in ${targetLangLabel}…`}
        disabled={state.isSaving}
        pending={isTargetReceiving}
        hasValue={state.targetText.length > 0}
        error={targetError}
        onChange={handleTargetChange}
      />

      {/* Save unlocks helper */}
      <p
        style={{
          fontSize: 12.5,
          color: "#9C8467",
          margin: 0,
          textAlign: "center",
        }}
      >
        Save unlocks once both sides are filled.
      </p>

      {/* Save button — ACBtn is a real <button> (L-06, Pitfall 2) */}
      <ACBtn kind={canSave ? "primary" : "disabled"} onClick={handleSave}>
        Save card
      </ACBtn>
    </div>
  );
}
