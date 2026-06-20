"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { TBtn } from "@/components/daybreak/t-btn";
import { authClient } from "@/lib/auth-client";
import { createDeck } from "@/lib/deck-actions";

// ============================================================
// Constants
// ============================================================

const ALL_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
] as const;

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

const LANG_ENUM = z.enum(["en", "fr", "es"]);

// ============================================================
// Component
// ============================================================

export function WelcomeStepChoose() {
  const router = useRouter();
  const [nativeLang, setNativeLang] = useState("en");
  const [targetLang, setTargetLang] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const targetOptions = ALL_LANGUAGES.filter((l) => l.code !== nativeLang);

  async function handleStart() {
    if (!targetLang) return;
    setIsCreating(true);
    setCreateError(null);

    // Security validation (T-19-04-INJ): validate both codes before sending to server
    const nativeParse = LANG_ENUM.safeParse(nativeLang);
    const targetParse = LANG_ENUM.safeParse(targetLang);
    if (!nativeParse.success || !targetParse.success) {
      setCreateError("Something went wrong. Try again.");
      setIsCreating(false);
      return;
    }

    try {
      // 1. Persist native language via better-auth /update-user (D-04)
      await authClient.updateUser({ nativeLanguage: nativeParse.data });
      // 2. Create first deck (server action — auth-guarded independently)
      await createDeck(targetParse.data);
      // 3. Route to dashboard
      router.push("/dashboard");
    } catch {
      // Preserve picks on error (do NOT reset nativeLang/targetLang)
      setCreateError("Something went wrong. Try again.");
      setIsCreating(false);
    }
  }

  const buttonLabel = isCreating && targetLang
    ? `Setting up your ${LANGUAGE_LABELS[targetLang] ?? targetLang} deck…`
    : createError
      ? "Try again"
      : "Start learning";

  return (
    <>
      {/* Dots row: dot 3 active, spacer instead of Skip */}
      <div className="flex items-center justify-between flex-none">
        <StepDots active={3} />
        {/* 30px spacer — step 3 has no Skip (language pick is mandatory) */}
        <span style={{ width: 30 }} />
      </div>

      <h1
        className="font-display font-bold text-foreground text-center flex-none"
        style={{ fontSize: 23 }}
      >
        Choose your languages
      </h1>

      {/* Language selects */}
      <div className="flex flex-col gap-[16px] flex-1">
        {/* Native language */}
        <div className="flex flex-col gap-[7px]">
          <label
            htmlFor="native-lang"
            className="text-[13px] font-bold text-foreground"
          >
            I speak
          </label>
          <div className="relative">
            <select
              id="native-lang"
              aria-label="I speak"
              className="h-[52px] w-full appearance-none rounded-xl border-[1.5px] border-[#EDDFC9] bg-[var(--db-field-bg)] px-4 text-[16px] font-semibold text-foreground focus:outline-none focus:border-primary"
              value={nativeLang}
              disabled={isCreating}
              onChange={(e) => {
                setNativeLang(e.target.value);
                // If target was the same language, reset it
                if (targetLang === e.target.value) setTargetLang(null);
              }}
            >
              {ALL_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>

        {/* Target language */}
        <div className="flex flex-col gap-[7px]">
          <label
            htmlFor="target-lang"
            className="text-[13px] font-bold text-foreground"
          >
            I want to learn
          </label>
          <div className="relative">
            <select
              id="target-lang"
              aria-label="I want to learn"
              className="h-[52px] w-full appearance-none rounded-xl border-[1.5px] border-[#EDDFC9] bg-[var(--db-field-bg)] px-4 text-[16px] font-semibold text-foreground focus:outline-none focus:border-primary"
              value={targetLang ?? ""}
              disabled={isCreating}
              onChange={(e) => setTargetLang(e.target.value || null)}
            >
              <option value="" disabled>
                Choose a language
              </option>
              {targetOptions.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
              {/* Chosen native appears as disabled option — matches OnbSelect "your language" pattern */}
              <option value={nativeLang} disabled>
                {LANGUAGE_LABELS[nativeLang]} (your language)
              </option>
            </select>
            <Chevron />
          </div>
        </div>

        {/* Error banner (ObError) — only shown when there is an error */}
        {createError && (
          <div
            className="flex items-center gap-2.5 rounded-xl"
            style={{
              padding: "11px 14px",
              background: "#FCEBE6",
              border: "1.5px solid #F2C9BF",
            }}
          >
            <span
              className="flex items-center justify-center rounded-full text-white text-[13px] font-bold flex-none"
              style={{
                width: 22,
                height: 22,
                background: "var(--destructive)",
              }}
            >
              !
            </span>
            <span className="text-[14px] font-semibold text-foreground">
              Something went wrong. Try again.
            </span>
          </div>
        )}
      </div>

      {/* Start learning button */}
      <TBtn
        isPending={isCreating}
        disabled={!targetLang}
        onClick={handleStart}
      >
        {buttonLabel}
      </TBtn>
    </>
  );
}

// Chevron icon positioned absolutely inside the select wrapper
function Chevron() {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        right: 16,
        top: "50%",
        transform: "translateY(-50%) rotate(45deg)",
        width: 9,
        height: 9,
        borderRight: "2.2px solid #B49B78",
        borderBottom: "2.2px solid #B49B78",
        marginTop: -2,
        pointerEvents: "none",
      }}
    />
  );
}

function StepDots({ active }: { active: number }) {
  return (
    <div className="flex items-center" style={{ gap: 7 }}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          style={{
            width: n === active ? 22 : 9,
            height: 9,
            borderRadius: 6,
            background: n === active ? "var(--primary)" : "#EAD9BE",
          }}
        />
      ))}
    </div>
  );
}
