import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  small?: boolean;
  /** 요청 중이면 비활성화하고 "잠깐만요…"를 보여준다. */
  loading?: boolean;
}

const styles: Record<Variant, string> = {
  primary: "bg-accent text-surface",
  secondary: "bg-surface text-text-primary border border-border",
  danger: "bg-danger text-surface",
};

export default function Button({
  variant = "primary",
  small,
  loading,
  disabled,
  className = "",
  children,
  ...rest
}: Props) {
  const off = disabled || loading;
  const look = off ? "bg-border text-text-muted cursor-not-allowed" : `${styles[variant]} active:scale-[0.98]`;
  return (
    <button
      type="button"
      {...rest}
      disabled={off}
      className={`${small ? "h-10" : "h-12"} min-w-11 rounded-full px-6 text-base font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${look} ${className}`}
    >
      {loading ? "잠깐만요…" : children}
    </button>
  );
}
