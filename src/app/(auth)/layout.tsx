import { LionFace } from "@/components/daybreak/lion-face";

// Daybreak auth family shell (shared by login / signup / forgot / reset):
// cream background, centered single column, brand row (Leo + "LeoCards").
// Each page supplies its own habitat-flashcard card + cross-link below.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-[26px] py-10">
      <div className="w-full max-w-[420px] flex flex-col gap-5">
        <div className="flex items-center justify-center gap-2.5">
          <LionFace size={32} />
          <span className="font-display text-[27px] font-bold leading-none text-foreground">
            LeoCards
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
