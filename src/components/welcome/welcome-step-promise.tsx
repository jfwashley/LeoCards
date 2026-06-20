"use client";

import { HabitatTeaser } from "./habitat-teaser";
import { TBtn } from "@/components/daybreak/t-btn";

interface WelcomeStepPromiseProps {
  onNext: () => void;
  onSkip: () => void;
}

export function WelcomeStepPromise({ onNext, onSkip }: WelcomeStepPromiseProps) {
  return (
    <>
      {/* Dots row: dot 2 active */}
      <div className="flex items-center justify-between flex-none">
        <StepDots active={2} />
        <button
          type="button"
          className="text-[14px] font-semibold text-muted-foreground"
          onClick={onSkip}
        >
          Skip
        </button>
      </div>

      {/* Centered content */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-[18px] text-center"
      >
        {/* Habitat teaser container */}
        <div
          className="w-full overflow-hidden"
          style={{
            height: 210,
            borderRadius: 20,
            border: "1px solid #F0E3CF",
            boxShadow: "0 10px 26px rgba(160,110,40,0.12)",
          }}
        >
          <HabitatTeaser />
        </div>

        <h1 className="font-display text-[24px] font-bold text-foreground">
          Learn words, grow your world
        </h1>
        <p className="text-[15px] text-muted-foreground leading-[1.5] max-w-[260px]">
          Every word you master adds something new to the habitat.
        </p>
      </div>

      {/* Next button */}
      <TBtn onClick={onNext}>Next</TBtn>
    </>
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
