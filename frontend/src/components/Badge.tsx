import type { HTMLAttributes } from "react";

export default function Badge({ className = "", ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      className={`inline-block rounded-full bg-pink-soft px-3 py-1 text-xs font-semibold text-accent ${className}`}
    />
  );
}
