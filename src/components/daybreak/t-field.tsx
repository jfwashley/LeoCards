"use client";
import * as React from "react";

interface TFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TField = React.forwardRef<HTMLInputElement, TFieldProps>(
  ({ label, error, hint, id, className: _className, ...inputProps }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={fieldId}
          className="text-[13px] font-semibold text-foreground"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={[
            "h-12 rounded-xl border-[1.5px] bg-[var(--db-field-bg)] px-3.5 text-[15px] shadow-none",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            error ? "border-destructive" : "border-[#EDDFC9]",
          ].join(" ")}
          {...inputProps}
        />
        {error && (
          <p className="text-[13px] font-semibold text-destructive">{error}</p>
        )}
        {!error && hint && (
          <p className="text-[12.5px] text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  },
);
TField.displayName = "TField";
