import type { PublicCandidate } from "../types";
import Button from "../components/Button";
import InlineMessage from "../components/InlineMessage";

interface Props {
  topic: string;
  /** 내가 싫어한 후보만 */
  disliked: PublicCandidate[];
  vetoId: string | null;
  onSelect: (id: string | null) => void;
  /** null이면 거부권을 쓰지 않는다. */
  onConfirm: (id: string | null) => void;
  error: string | null;
}

export default function Veto({ topic, disliked, vetoId, onSelect, onConfirm, error }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">{topic}</h1>
        <p className="text-xl font-bold text-text-primary">🚫 거부권은 딱 1장!</p>
        <p className="text-sm text-text-secondary">정말 싫은 후보 하나만 골라 주세요</p>
      </div>

      <ul className="flex flex-col gap-2">
        {disliked.map((c) => {
          const selected = vetoId === c.candidate_id;
          return (
            <li key={c.candidate_id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(selected ? null : c.candidate_id)}
                className={`flex min-h-12 w-full items-center justify-between rounded-2xl border-2 bg-surface px-4 py-3 text-left text-base font-semibold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  selected ? "border-danger" : "border-border"
                }`}
              >
                <span>{c.name}</span>
                {selected && <span className="text-danger">✓ 선택</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <InlineMessage message={error} />

      <div className="grid grid-cols-2 gap-4">
        <Button variant="secondary" onClick={() => onConfirm(null)}>
          {error ? "다시 제출하기" : "거부 안 할래요"}
        </Button>
        <Button variant="danger" disabled={vetoId === null} onClick={() => onConfirm(vetoId)}>
          이걸로 거부
        </Button>
      </div>
    </div>
  );
}
