import type { ChangeEvent } from "react";
import { clampText } from "../lib/text";

interface Props {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  /** false이면 (현재/최대) 글자 수 표시를 숨긴다. */
  showCounter?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** 입력 값 변환 (예: 대문자로) */
  transform?: (value: string) => string;
  id?: string;
  ariaLabel?: string;
}

export default function LimitedInput({
  value,
  onChange,
  maxLength,
  showCounter = true,
  placeholder,
  disabled,
  transform,
  id,
  ariaLabel,
}: Props) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const next = transform ? transform(e.target.value) : e.target.value;
    onChange(clampText(next, maxLength));
  };

  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        aria-label={ariaLabel}
        className="h-12 min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 text-base text-text-primary placeholder:text-text-muted placeholder:opacity-60 focus-visible:outline-2 focus-visible:outline-accent disabled:bg-border disabled:text-text-muted"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handle}
      />
      {showCounter && (
        <span className="shrink-0 text-xs text-text-muted">
          ({value.length}/{maxLength})
        </span>
      )}
    </div>
  );
}
