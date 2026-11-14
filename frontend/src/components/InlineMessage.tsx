interface Props {
  message?: string | null;
  tone?: "error" | "info" | "success";
  className?: string;
}

const tones = {
  error: "text-danger",
  info: "text-text-secondary",
  success: "text-success",
} as const;

/** 입력 아래에 나오는 오류/안내 문구. 팝업 없이 화면 안에만 보여준다. */
export default function InlineMessage({ message, tone = "error", className = "" }: Props) {
  if (!message) return null;
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`text-sm ${tones[tone]} ${className}`}>
      {message}
    </p>
  );
}
