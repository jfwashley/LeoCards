"use client";

interface WelcomeStepMeetProps {
  onNext: () => void;
  onSkip: () => void;
}

import { LionFace } from "@/components/daybreak/lion-face";
import { TBtn } from "@/components/daybreak/t-btn";

export function WelcomeStepMeet({ onNext, onSkip }: WelcomeStepMeetProps) {
  return (
    <>
      {/* Dots row: dot 1 active */}
      <div className="flex items-center justify-between flex-none">
        <StepDots active={1} />
        <button
          type="button"
          className="text-[14px] font-semibold text-muted-foreground"
          onClick={onSkip}
        >
          Skip
        </button>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
        {/* Leo circle */}
        <div
          className="relative flex items-center justify-center rounded-full flex-none"
          style={{
            width: 156,
            height: 156,
            background: "linear-gradient(180deg, #FFE7BC, #FFFDF8)",
            border: "1px solid #F0E3CF",
          }}
        >
          {/* Sun disc */}
          <div
            style={{
              position: "absolute",
              right: 22,
              top: 20,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#FFC95C",
            }}
          />
          <LionFace
            size={92}
            mane="#E8973B"
            face="#FFD9A6"
            muzzle="#FFF1DC"
            ink="#4A331C"
          />
        </div>

        <h1 className="font-display text-[28px] font-bold text-foreground">
          Meet Leo
        </h1>
        <p className="text-[15px] text-muted-foreground leading-[1.5] max-w-[250px]">
          Your lion lives in a habitat that grows as you learn.
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
