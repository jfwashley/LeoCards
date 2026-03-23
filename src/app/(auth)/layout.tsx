export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-col items-center">
          <span className="text-[2.5rem]">🐯</span>
          <h1 className="text-[28px] font-semibold leading-[1.15]">
            TioCards
          </h1>
          <p className="text-muted-foreground text-sm">
            Your tiger is waiting.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
