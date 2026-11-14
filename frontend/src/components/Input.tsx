import type { InputHTMLAttributes } from "react";

export default function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-text-primary placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-accent disabled:bg-border disabled:text-text-muted ${className}`}
    />
  );
}
