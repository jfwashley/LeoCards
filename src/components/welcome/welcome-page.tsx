"use client";

import { useState } from "react";

import { WelcomeStepChoose } from "./welcome-step-choose";
import { WelcomeStepMeet } from "./welcome-step-meet";
import { WelcomeStepPromise } from "./welcome-step-promise";

type Step = 1 | 2 | 3;

export function WelcomePage() {
  const [step, setStep] = useState<Step>(1);

  // Shell: full-height flex column matching OnbShell rhythm.
  // The (auth)/layout.tsx provides the outer cream bg + max-w-[420px] column + brand row.
  // This adds the inner padding and gap per the handoff spec (padding 12px 24px 24px, gap 18).
  return (
    <div
      className="flex flex-col"
      style={{ padding: "12px 24px 24px", gap: 18, minHeight: "calc(100vh - 130px)" }}
    >
      {step === 1 && (
        <WelcomeStepMeet
          onNext={() => setStep(2)}
          onSkip={() => setStep(3)}
        />
      )}
      {step === 2 && (
        <WelcomeStepPromise
          onNext={() => setStep(3)}
          onSkip={() => setStep(3)}
        />
      )}
      {step === 3 && <WelcomeStepChoose />}
    </div>
  );
}
