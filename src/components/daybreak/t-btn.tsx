import { Loader2 } from "lucide-react";
import * as React from "react";

interface TBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPending?: boolean;
}

export function TBtn({
  isPending,
  children,
  disabled,
  className,
  ...props
}: TBtnProps) {
  return (
    <button
      disabled={isPending || disabled}
      className={[
        "h-[50px] w-full rounded-[14px] text-[16px] font-bold",
        "bg-primary text-primary-foreground",
        "shadow-[var(--db-btn-shadow)]",
        "hover:brightness-[0.97] disabled:opacity-60 disabled:cursor-not-allowed",
        "flex items-center justify-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {isPending ? <Loader2 className="size-5 animate-spin" /> : children}
    </button>
  );
}
