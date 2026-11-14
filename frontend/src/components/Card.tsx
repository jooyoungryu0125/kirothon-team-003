import type { HTMLAttributes } from "react";

export default function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={`rounded-3xl border border-border bg-surface p-6 shadow-sm ${className}`} />;
}
