"use client";

import { AlertCircle, ArrowLeft, ImageOff, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { type DeckOption, DeckSwitcher } from "@/components/deck-switcher";
import {
  ImageDropZone,
  type ImageDropZoneHandle,
} from "@/components/image-drop-zone";
import { ReviewList } from "@/components/review-list";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { validateImageFile } from "@/lib/image-validation";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

interface ImageUploadFlowProps {
  decks: DeckOption[];
  defaultDeckId: string;
  nativeLang: string;
}

interface ImageFlowState {
  step: "pick" | "deck";
  file: File | null;
  previewUrl: string | null;
  pickError: string | null;
  selectedDeckId: string;
  extracting: boolean;
  extractError: { status: number; message: string } | null;
  extractWords: string[] | null;
}

type ImageFlowAction =
  | { type: "FILE_PICKED"; file: File; previewUrl: string }
  | { type: "FILE_ERROR"; message: string }
  | { type: "CLEAR_FILE" }
  | { type: "ADVANCE_STEP" }
  | { type: "BACK_TO_PICK" }
  | { type: "SET_DECK"; deckId: string }
  | { type: "EXTRACT_START" }
  | { type: "EXTRACT_SUCCESS"; words: string[] }
  | { type: "EXTRACT_NO_WORDS" }
  | { type: "EXTRACT_ERROR"; status: number; message: string }
  | { type: "EXTRACT_RETRY" };

export function imageFlowReducer(
  state: ImageFlowState,
  action: ImageFlowAction,
): ImageFlowState {
  switch (action.type) {
    case "FILE_PICKED":
      return {
        ...state,
        file: action.file,
        previewUrl: action.previewUrl,
        pickError: null,
      };
    case "FILE_ERROR":
      return {
        ...state,
        file: null,
        previewUrl: null,
        pickError: action.message,
      };
    case "CLEAR_FILE":
      return {
        ...state,
        file: null,
        previewUrl: null,
        pickError: null,
        step: "pick",
      };
    case "ADVANCE_STEP":
      return state.file ? { ...state, step: "deck" } : state;
    case "BACK_TO_PICK":
      return { ...state, step: "pick" };
    case "SET_DECK":
      return { ...state, selectedDeckId: action.deckId };
    case "EXTRACT_START":
      return {
        ...state,
        extracting: true,
        extractError: null,
        extractWords: null,
      };
    case "EXTRACT_SUCCESS":
      return { ...state, extracting: false, extractWords: action.words };
    case "EXTRACT_NO_WORDS":
      return { ...state, extracting: false, extractWords: [] };
    case "EXTRACT_ERROR":
      return {
        ...state,
        extracting: false,
        extractError: { status: action.status, message: action.message },
      };
    // file / previewUrl / selectedDeckId are NOT touched — D-16 preservation
    case "EXTRACT_RETRY":
      return {
        ...state,
        extracting: true,
        extractError: null,
        extractWords: null,
      };
    default:
      return state;
  }
}

function friendlyErrorCopy(status: number): string {
  switch (status) {
    case 429:
      return "You've made too many requests — please wait a moment and try again.";
    case 413:
      return "That image is too large for the server to process. Please choose a smaller image (under 5MB).";
    case 415:
      return "That file type isn't supported. Please choose a JPG, PNG, or WebP image.";
    case 504:
      return "The extraction took too long and timed out. Please try again — it usually works on the second attempt.";
    case 503:
      return "The word extraction feature isn't available right now. Please try again later.";
    case 502:
    case 500:
      return "Something went wrong with the word extraction. Please try again.";
    case 400:
      return "There was a problem with the request. Please go back and choose a new image.";
    case 401:
      return "Your session has expired. Please refresh the page and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function ImageUploadFlow({
  decks,
  defaultDeckId,
  nativeLang,
}: ImageUploadFlowProps) {
  const [state, dispatch] = useReducer(imageFlowReducer, {
    step: "pick",
    file: null,
    previewUrl: null,
    pickError: null,
    selectedDeckId: defaultDeckId,
    extracting: false,
    extractError: null,
    extractWords: null,
  });

  // Track latest previewUrl in a ref so cleanup always revokes the current URL
  // (avoids stale closure on unmount — RESEARCH.md A6)
  const previewUrlRef = useRef<string | null>(null);
  previewUrlRef.current = state.previewUrl;

  // Always keep dropZoneRef mounted so openPicker() / resetInput() stay available
  const dropZoneRef = useRef<ImageDropZoneHandle>(null);

  // Safety net: runs only on unmount — revokes latest URL via ref
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleValidFile = useCallback((file: File) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    dispatch({ type: "FILE_PICKED", file, previewUrl: url });
  }, []);

  const validateAndSetFile = useCallback(
    (file: File) => {
      const r = validateImageFile(file);
      if (r.ok) {
        handleValidFile(file);
      } else {
        dispatch({ type: "FILE_ERROR", message: r.message });
      }
    },
    [handleValidFile],
  );

  function handleClearFile() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    dropZoneRef.current?.resetInput();
    dispatch({ type: "CLEAR_FILE" });
  }

  // Phase 10: POST to /api/extract and dispatch extraction state actions
  async function handleExtract() {
    if (!state.file || !state.selectedDeckId || state.extracting) return;
    dispatch({ type: "EXTRACT_START" });

    // Read file as data-URL (file is guaranteed non-null by the guard above)
    const file = state.file;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      // Wrap the ProgressEvent in an Error so the outer catch's
      // `err instanceof Error` check sees a real Error (WR-03).
      reader.onerror = () => reject(new Error("FileReader error"));
      reader.readAsDataURL(file);
    });

    // deck.language is already BCP-47 ("en"/"fr"/"es") per DeckOption — no DeckOption schema change needed.
    // IN-03: Surface a missing-deck mismatch as a loud error instead of silently
    // defaulting to French. selectedDeckId is set from the same `decks` list,
    // so this branch should be unreachable in practice; if it fires, something
    // upstream is wrong and we'd rather see it than send the call to the wrong language.
    const deck = decks.find((d) => d.id === state.selectedDeckId);
    if (!deck) {
      dispatch({
        type: "EXTRACT_ERROR",
        status: 0,
        message: "Deck not found.",
      });
      return;
    }
    const targetLanguage = deck.language;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35_000); // 35s client > 30s server so server's clean 504 wins

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: dataUrl,
          mimeType: file.type,
          deckId: state.selectedDeckId,
          targetLanguage,
        }),
        signal: controller.signal,
      });

      if (res.ok) {
        const data = (await res.json()) as {
          words: string[];
          detectedLanguage?: string;
        };
        if (data.words.length === 0) {
          dispatch({ type: "EXTRACT_NO_WORDS" });
        } else {
          dispatch({ type: "EXTRACT_SUCCESS", words: data.words });
        }
      } else {
        const data = (await res
          .json()
          .catch(() => ({ error: "Unknown error" }))) as { error: string };
        dispatch({
          type: "EXTRACT_ERROR",
          status: res.status,
          message: data.error ?? "Unknown error",
        });
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      dispatch({
        type: "EXTRACT_ERROR",
        status: isAbort ? 504 : 0,
        message: isAbort ? "The extraction timed out." : "Network error.",
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Document paste listener (RESEARCH.md Pattern 3c)
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const file = e.clipboardData?.files?.[0];
      if (file) validateAndSetFile(file);
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [validateAndSetFile]);

  // Step 2: recap thumbnail + deck selector — 5 states per 10-UI-SPEC
  if (state.step === "deck") {
    // Render precedence: extracting → error → no-words([]) → success(non-empty) → idle

    // State 1 — In-flight / Loading (EXT-02)
    if (state.extracting) {
      return (
        <div className="flex flex-col gap-4">
          {/* biome-ignore lint/performance/noImgElement: blob URLs are unsupported by next/image; plain <img> required for object URL preview (RESEARCH.md Pitfall 5) */}
          <img
            src={state.previewUrl ?? ""}
            alt="Selected file"
            className="max-h-32 w-auto object-contain rounded-md"
          />
          <Label>Add words to:</Label>
          {/* Wrap DeckSwitcher in pointer-events-none during in-flight — DeckSwitcher has no disabled prop */}
          <div className="pointer-events-none opacity-60">
            <DeckSwitcher
              decks={decks}
              activeDeckId={state.selectedDeckId}
              onDeckChange={(id) => dispatch({ type: "SET_DECK", deckId: id })}
              nativeLang={nativeLang}
            />
          </div>
          {/* Back button hidden during in-flight — prevents navigating away while request is in flight */}
          <Button
            className="w-full h-11"
            variant="default"
            disabled
            aria-busy="true"
            aria-label="Extracting words, please wait"
          >
            <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />
            Extracting words…
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            This can take up to 30 seconds…
          </p>
        </div>
      );
    }

    // State 4 — Error (EXT-04)
    if (state.extractError) {
      return (
        <div className="flex flex-col gap-4">
          {/* biome-ignore lint/performance/noImgElement: blob URLs are unsupported by next/image; plain <img> required for object URL preview (RESEARCH.md Pitfall 5) */}
          <img
            src={state.previewUrl ?? ""}
            alt="Selected file"
            className="max-h-32 w-auto object-contain rounded-md"
          />
          <Label>Add words to:</Label>
          <DeckSwitcher
            decks={decks}
            activeDeckId={state.selectedDeckId}
            onDeckChange={(id) => dispatch({ type: "SET_DECK", deckId: id })}
            nativeLang={nativeLang}
          />
          <Button
            variant="ghost"
            onClick={() => dispatch({ type: "BACK_TO_PICK" })}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <p role="alert" className="text-sm text-destructive mt-1">
            <AlertCircle className="inline size-4 mr-1" aria-hidden="true" />
            {friendlyErrorCopy(state.extractError.status)}
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                dispatch({ type: "EXTRACT_RETRY" });
                void handleExtract();
              }}
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }

    // State 3 — No Words Found (EXT-03): extractWords is [] (empty array, NOT null)
    if (Array.isArray(state.extractWords) && state.extractWords.length === 0) {
      return (
        <div className="flex flex-col gap-4">
          {/* biome-ignore lint/performance/noImgElement: blob URLs are unsupported by next/image; plain <img> required for object URL preview (RESEARCH.md Pitfall 5) */}
          <img
            src={state.previewUrl ?? ""}
            alt="Selected file"
            className="max-h-32 w-auto object-contain rounded-md"
          />
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <ImageOff className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              No words found in this image.
            </p>
            <p className="text-sm text-muted-foreground">
              Try a photo with clearer text, or choose a different image.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                dispatch({ type: "BACK_TO_PICK" });
                dispatch({ type: "CLEAR_FILE" });
              }}
            >
              Choose another image
            </Button>
          </div>
        </div>
      );
    }

    // State 2 — Success (RVW-01): extractWords is non-empty array — hand off to ReviewList
    if (Array.isArray(state.extractWords) && state.extractWords.length > 0) {
      const deck = decks.find((d) => d.id === state.selectedDeckId);
      // IN-03: selectedDeckId is always sourced from `decks`, so a missing match
      // means props are stale or there is a race during re-render. Render an
      // explicit error instead of silently defaulting the target language to "fr".
      if (!deck) {
        return (
          <div role="alert" className="text-sm text-destructive">
            <AlertCircle className="inline size-4 mr-1" aria-hidden="true" />
            Deck not found.
          </div>
        );
      }
      const targetLang = deck.language;
      return (
        <ReviewList
          words={state.extractWords}
          deckId={state.selectedDeckId}
          nativeLang={nativeLang}
          targetLang={targetLang}
          onCancel={() => dispatch({ type: "BACK_TO_PICK" })}
          nativeLangLabel={LANGUAGE_LABELS[nativeLang] ?? nativeLang}
          targetLangLabel={LANGUAGE_LABELS[targetLang] ?? targetLang}
        />
      );
    }

    // State 0 — Idle (Phase 9 carry-forward)
    return (
      <div className="flex flex-col gap-4">
        {/* biome-ignore lint/performance/noImgElement: blob URLs are unsupported by next/image; plain <img> required for object URL preview (RESEARCH.md Pitfall 5) */}
        <img
          src={state.previewUrl ?? ""}
          alt="Selected file"
          className="max-h-32 w-auto object-contain rounded-md"
        />
        <Label>Add words to:</Label>
        <DeckSwitcher
          decks={decks}
          activeDeckId={state.selectedDeckId}
          onDeckChange={(id) => dispatch({ type: "SET_DECK", deckId: id })}
          nativeLang={nativeLang}
        />
        <Button
          variant="ghost"
          onClick={() => dispatch({ type: "BACK_TO_PICK" })}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          className="w-full h-11"
          variant="default"
          disabled={!state.file || !state.selectedDeckId}
          onClick={handleExtract}
        >
          Extract words
        </Button>
      </div>
    );
  }

  // Step 1, previewing state: file is held
  if (state.file) {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative inline-block">
          {/* biome-ignore lint/performance/noImgElement: blob URLs are unsupported by next/image; plain <img> required for object URL preview (RESEARCH.md Pitfall 5) */}
          <img
            src={state.previewUrl ?? ""}
            alt="Selected file"
            className="max-h-64 w-auto object-contain rounded-lg"
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove selected image"
            onClick={handleClearFile}
            className="absolute top-2 right-2"
          >
            <X className="size-4" />
          </Button>
        </div>
        {/* Keep drop zone mounted (hidden) so dropZoneRef stays valid for openPicker/resetInput */}
        <div className="hidden">
          <ImageDropZone
            ref={dropZoneRef}
            onFileSelect={validateAndSetFile}
            error={null}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => dropZoneRef.current?.openPicker()}
        >
          Choose different image
        </Button>
        <Button
          variant="default"
          className="w-full"
          onClick={() => dispatch({ type: "ADVANCE_STEP" })}
        >
          Next: choose deck
        </Button>
      </div>
    );
  }

  // Step 1, empty state: show drop zone
  return (
    <div className="flex flex-col gap-4">
      <ImageDropZone
        ref={dropZoneRef}
        onFileSelect={validateAndSetFile}
        error={state.pickError}
      />
    </div>
  );
}
