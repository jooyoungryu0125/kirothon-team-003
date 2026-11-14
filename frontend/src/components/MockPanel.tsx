import { useState } from "react";
import { mockJumpTo, type JumpTarget } from "../mock";
import Button from "./Button";
import InlineMessage from "./InlineMessage";

interface Props {
  roomCode: string | null;
  /** 단계를 바꾼 뒤 폴링을 다시 시작한다. */
  onChanged: () => void;
}

const buttons: { target: JumpTarget; label: string }[] = [
  { target: "collecting", label: "후보 모으는 중" },
  { target: "voting", label: "투표 중" },
  { target: "done-plain", label: "결과 (동점 없음)" },
  { target: "done-tie", label: "결과 (동점 있음)" },
];

/** USE_MOCK일 때만 보이는 "예시 데이터" 배지와 개발용 단계 전환 패널 */
export default function MockPanel({ roomCode, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const jump = (target: JumpTarget) => {
    if (!roomCode) return;
    try {
      mockJumpTo(roomCode, target);
      setMessage(null);
      onChanged();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "바꾸지 못했어요.");
    }
  };

  return (
    <>
      <span className="fixed right-2 top-2 z-50 rounded-full bg-pink-soft px-3 py-1 text-xs text-accent">
        예시 데이터
      </span>
      <div className="fixed bottom-2 right-2 z-50 flex max-w-xs flex-col items-end gap-2">
        {open && (
          <div className="flex flex-col gap-2 rounded-3xl border border-border bg-surface p-4">
            <p className="text-xs text-text-muted">개발용 · 방 단계 바꾸기</p>
            {roomCode ? (
              buttons.map((b) => (
                <Button key={b.target} small variant="secondary" onClick={() => jump(b.target)}>
                  {b.label}
                </Button>
              ))
            ) : (
              <p className="text-sm text-text-secondary">먼저 방을 만들어 주세요.</p>
            )}
            <InlineMessage message={message} />
          </div>
        )}
        <Button small variant="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "닫기" : "개발용"}
        </Button>
      </div>
    </>
  );
}
