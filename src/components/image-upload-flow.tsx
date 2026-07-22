"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { ACBanner } from "@/components/daybreak/ac-banner";
import { ACBtn } from "@/components/daybreak/ac-btn";
import { ACDeckSelect } from "@/components/daybreak/ac-deck-select";
import { ACProgress } from "@/components/daybreak/ac-progress";
import { ACStepper } from "@/components/daybreak/ac-stepper";
import { LionFace } from "@/components/daybreak/lion-face";
import type { DeckOption } from "@/components/deck-switcher";
import {
  ImageDropZone,
  type ImageDropZoneHandle,
} from "@/components/image-drop-zone";
import { ReviewList } from "@/components/review-list";
import { resizeImageForUpload } from "@/lib/image-resize";
import { validateImageFile } from "@/lib/image-validation";

// Stepper stage indices (D-05)
const STAGE_IMAGE = 0; // Confirm lives under "Image" dot
const STAGE_EXTRACT = 1; // Extracting lives under "Extract" dot

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

export interface ImageFlowState {
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
  | { type: "EXTRACT_RETRY" }
  | { type: "EXTRACT_CANCEL" };

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
    case "EXTRACT_CANCEL":
      // D-03: cancel the in-flight extraction and return to the Confirm surface.
      // step stays "deck" (Confirm), NOT "pick" (the dropzone); file / previewUrl /
      // selectedDeckId are NOT touched — D-16 preservation.
      return {
        ...state,
        extracting: false,
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
      return "That image is too large for the server to process. Please choose a smaller image (under 4MB).";
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

// Left chevron glyph (no emoji, L-01)
function LeftChev({ c = "#C96F12", size = 8 }: { c?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderLeft: `2.2px solid ${c}`,
        borderBottom: `2.2px solid ${c}`,
        transform: "rotate(45deg)",
        display: "inline-block",
        flex: "none",
      }}
    />
  );
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

  // D-03: cancelled guard — modeled on review-list.tsx line 451
  const cancelled = useRef(false);

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
    // Pitfall 6: auto-advance to Confirm immediately on valid file pick (D-06)
    dispatch({ type: "ADVANCE_STEP" });
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
    cancelled.current = true; // WR-01: guard late extraction result after Re-pick
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    dropZoneRef.current?.resetInput();
    dispatch({ type: "CLEAR_FILE" });
  }

  // D-03: Cancel on Extracting → returns to Confirm with image+deck preserved (D-16)
  function handleCancelExtraction() {
    cancelled.current = true;
    // EXTRACT_CANCEL keeps step "deck" (the Confirm surface) and clears `extracting`,
    // preserving file + deck. BACK_TO_PICK would wrongly drop back to the dropzone.
    dispatch({ type: "EXTRACT_CANCEL" });
  }

  // Phase 10: POST to /api/extract and dispatch extraction state actions
  async function handleExtract() {
    if (!state.file || !state.selectedDeckId || state.extracting) return;
    // D-03: reset guard before each attempt (Pitfall 3)
    cancelled.current = false;
    dispatch({ type: "EXTRACT_START" });

    // Read file as data-URL (file is guaranteed non-null by the guard above)
    const file = state.file;
    // D-06/PERF-10: downscale client-side (~1568px, JPEG q0.8) before the
    // upload — a UX/bandwidth optimization only, never a security control
    // (the server's MAX_SERVER_IMAGE_BYTES cap is authoritative). Guard
    // against a Cancel landing while the resize is in flight (D-03).
    const resized = await resizeImageForUpload(file);
    if (cancelled.current) return; // D-03 late-result guard
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      // Wrap the ProgressEvent in an Error so the outer catch's
      // `err instanceof Error` check sees a real Error (WR-03).
      reader.onerror = () => reject(new Error("FileReader error"));
      reader.readAsDataURL(resized);
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
          // resizeImageForUpload always re-encodes to JPEG (canvas.toBlob),
          // so the declared mimeType must match the resized bytes, not the
          // original file.type — the server magic-byte checks the two
          // against each other (route.ts:141) and would otherwise reject
          // e.g. a re-encoded PNG as a mimeType mismatch.
          mimeType: "image/jpeg",
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
          if (cancelled.current) return; // D-03 late-result guard
          dispatch({ type: "EXTRACT_NO_WORDS" });
        } else {
          if (cancelled.current) return; // D-03 late-result guard
          dispatch({ type: "EXTRACT_SUCCESS", words: data.words });
        }
      } else {
        const data = (await res
          .json()
          .catch(() => ({ error: "Unknown error" }))) as { error: string };
        if (cancelled.current) return; // D-03 late-result guard
        dispatch({
          type: "EXTRACT_ERROR",
          status: res.status,
          message: data.error ?? "Unknown error",
        });
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      if (cancelled.current) return; // D-03 late-result guard
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
      if (file) {
        // Suppress browser default only for image paste; normal text-input
        // paste in sibling components remains unaffected. (WR-02)
        e.preventDefault();
        validateAndSetFile(file);
      }
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [validateAndSetFile]);

  // Step "deck" — Confirm + Extracting + error + no-words + success states
  if (state.step === "deck") {
    // Render precedence: extracting → error → no-words([]) → success(non-empty) → idle (Confirm)

    // Extracting (EXT-02)
    if (state.extracting) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* ACFlowTop: Re-pick (left) + title + Cancel (right) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 4,
            }}
          >
            <button
              type="button"
              onClick={() => {
                handleClearFile();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#C96F12",
                fontWeight: 700,
                fontSize: 14.5,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <LeftChev />
              Re-pick
            </button>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 700,
                color: "#4A331C",
              }}
            >
              From an image
            </span>
            <button
              type="button"
              onClick={handleCancelExtraction}
              style={{
                color: "#9C8467",
                fontWeight: 600,
                fontSize: 14.5,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                width: 52,
                textAlign: "right",
              }}
            >
              Cancel
            </button>
          </div>

          {/* Stepper: "Extract" dot active */}
          <ACStepper current={STAGE_EXTRACT} />

          {/* ACProgress */}
          <ACProgress
            title="Reading your image…"
            sub="This can take up to 30 seconds. Hang tight — your lion is sniffing out the words."
            searching={true}
          />
        </div>
      );
    }

    // Extract error (EXT-04)
    if (state.extractError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* ACFlowTop */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 4,
            }}
          >
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "BACK_TO_PICK" });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#C96F12",
                fontWeight: 700,
                fontSize: 14.5,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <LeftChev />
              Back
            </button>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 700,
                color: "#4A331C",
              }}
            >
              From an image
            </span>
            <button
              type="button"
              onClick={() => window.location.assign("/dashboard")}
              style={{
                color: "#9C8467",
                fontWeight: 600,
                fontSize: 14.5,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                width: 52,
                textAlign: "right",
              }}
            >
              Cancel
            </button>
          </div>

          <ACStepper current={STAGE_IMAGE} />

          {/* biome-ignore lint/performance/noImgElement: blob URLs are unsupported by next/image; plain <img> required for object URL preview */}
          <img
            src={state.previewUrl ?? undefined}
            alt="Selected file"
            data-testid="image-preview"
            style={{
              borderRadius: 16,
              height: 168,
              width: "100%",
              objectFit: "cover",
            }}
          />

          <ACBanner kind="error">
            {friendlyErrorCopy(state.extractError.status)}
          </ACBanner>

          <ACBtn
            kind="ghost"
            onClick={() => {
              void handleExtract();
            }}
          >
            Try again
          </ACBtn>
        </div>
      );
    }

    // No words found (EXT-03)
    if (Array.isArray(state.extractWords) && state.extractWords.length === 0) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* ACFlowTop */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 4,
            }}
          >
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "BACK_TO_PICK" });
                dispatch({ type: "CLEAR_FILE" });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#C96F12",
                fontWeight: 700,
                fontSize: 14.5,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <LeftChev />
              Re-pick
            </button>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 700,
                color: "#4A331C",
              }}
            >
              From an image
            </span>
            <button
              type="button"
              onClick={() => window.location.assign("/dashboard")}
              style={{
                color: "#9C8467",
                fontWeight: 600,
                fontSize: 14.5,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                width: 52,
                textAlign: "right",
              }}
            >
              Cancel
            </button>
          </div>

          <ACStepper current={STAGE_IMAGE} />

          {/* LionFace no-words empty state */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              padding: "28px 0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "linear-gradient(180deg, #FFE7BC, #FFFDF8)",
                border: "1px solid #F0E3CF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LionFace
                size={52}
                mane="#E8973B"
                face="#FFD9A6"
                muzzle="#FFF1DC"
                ink="#4A331C"
              />
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 700,
                color: "#4A331C",
              }}
            >
              No words found.
            </span>
            <span style={{ fontSize: 14.5, color: "#9C8467", maxWidth: 260 }}>
              Try a photo with clearer text, or choose a different image.
            </span>
          </div>

          <ACBtn
            kind="ghost"
            onClick={() => {
              dispatch({ type: "BACK_TO_PICK" });
              dispatch({ type: "CLEAR_FILE" });
            }}
          >
            Choose another image
          </ACBtn>
        </div>
      );
    }

    // Success (RVW-01): extractWords is non-empty — hand off to ReviewList
    if (Array.isArray(state.extractWords) && state.extractWords.length > 0) {
      const deck = decks.find((d) => d.id === state.selectedDeckId);
      // IN-03: selectedDeckId is always sourced from `decks`, so a missing match
      // means props are stale or there is a race during re-render.
      if (!deck) {
        return <ACBanner kind="error">Deck not found.</ACBanner>;
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

    // Confirm (idle — step "deck", no extraction in progress)
    const activeDeck = decks.find((d) => d.id === state.selectedDeckId);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* ACFlowTop: Re-pick (left) + title + Cancel (right) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 4,
          }}
        >
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "BACK_TO_PICK" });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#C96F12",
              fontWeight: 700,
              fontSize: 14.5,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <LeftChev />
            Re-pick
          </button>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 700,
              color: "#4A331C",
            }}
          >
            From an image
          </span>
          <button
            type="button"
            onClick={() => window.location.assign("/dashboard")}
            style={{
              color: "#9C8467",
              fontWeight: 600,
              fontSize: 14.5,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              width: 52,
              textAlign: "right",
            }}
          >
            Cancel
          </button>
        </div>

        {/* Stepper: "Image" dot active (Confirm lives under Image dot) */}
        <ACStepper current={STAGE_IMAGE} />

        {/* ACThumb — the selected image thumbnail */}
        {/* biome-ignore lint/performance/noImgElement: blob URLs are unsupported by next/image; plain <img> required for object URL preview */}
        <img
          src={state.previewUrl ?? undefined}
          alt="Selected file"
          data-testid="image-preview"
          style={{
            borderRadius: 16,
            height: 168,
            width: "100%",
            objectFit: "cover",
            flex: "none",
          }}
        />

        {/* Change image / Remove controls */}
        <div style={{ display: "flex", gap: 10 }}>
          <ACBtn
            kind="ghost"
            onClick={() => dropZoneRef.current?.openPicker()}
            style={{ fontSize: 14, height: 40 }}
          >
            Change image
          </ACBtn>
          <ACBtn
            kind="ghost-danger"
            onClick={handleClearFile}
            style={{ fontSize: 14, height: 40 }}
          >
            Remove
          </ACBtn>
        </div>

        {/* ACDeckSelect — full-width "Add words to" field (D-02) */}
        <ACDeckSelect
          decks={decks}
          activeDeckId={state.selectedDeckId ?? activeDeck?.id ?? null}
          onDeckChange={(id) => dispatch({ type: "SET_DECK", deckId: id })}
          nativeLang={nativeLang}
        />

        {/* Hidden drop zone keeps ref alive for openPicker */}
        <div style={{ display: "none" }}>
          <ImageDropZone
            ref={dropZoneRef}
            onFileSelect={validateAndSetFile}
            error={null}
          />
        </div>

        {/* Extract words CTA */}
        <ACBtn
          kind={state.file && state.selectedDeckId ? "primary" : "disabled"}
          disabled={!state.file || !state.selectedDeckId}
          onClick={() => void handleExtract()}
        >
          Extract words
        </ACBtn>
      </div>
    );
  }

  // Step "pick" — show the Daybreak ACDrop (no stepper — pre-stepper)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ImageDropZone
        ref={dropZoneRef}
        onFileSelect={validateAndSetFile}
        error={state.pickError}
      />
    </div>
  );
}
