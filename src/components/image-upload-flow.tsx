"use client";

import { ArrowLeft, Loader2, ImageOff, AlertCircle, X } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { type DeckOption, DeckSwitcher } from "@/components/deck-switcher";
import {
  ImageDropZone,
  type ImageDropZoneHandle,
} from "@/components/image-drop-zone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { validateImageFile } from "@/lib/image-validation";

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
      return { ...state, extracting: true, extractError: null, extractWords: null };
    case "EXTRACT_SUCCESS":
      return { ...state, extracting: false, extractWords: action.words };
    case "EXTRACT_NO_WORDS":
      return { ...state, extracting: false, extractWords: [] };
    case "EXTRACT_ERROR":
      return { ...state, extracting: false, extractError: { status: action.status, message: action.message } };
      // file / previewUrl / selectedDeckId are NOT touched — D-16 preservation
    case "EXTRACT_RETRY":
      return { ...state, extracting: true, extractError: null, extractWords: null };
    default:
      return state;
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

  // Phase 10 wires extraction here
  function handleExtract() {}

  // Document paste listener (RESEARCH.md Pattern 3c)
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const file = e.clipboardData?.files?.[0];
      if (file) validateAndSetFile(file);
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [validateAndSetFile]);

  // Step 2: recap thumbnail + deck selector
  if (state.step === "deck") {
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
