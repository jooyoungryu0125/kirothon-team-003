import type { Choice, PublicCandidate } from "../types";
import Button from "../components/Button";
import FlipCard from "../components/FlipCard";
import ProgressBar from "../components/ProgressBar";

interface Props {
  topic: string;
  candidates: PublicCandidate[];
  index: number;
  flipped: boolean;
  onToggle: () => void;
  onChoose: (choice: Choice) => void;
}

export default function CardVote({ topic, candidates, index, flipped, onToggle, onChoose }: Props) {
  const current = candidates[index];
  const total = candidates.length;
  if (!current) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">{topic}</h1>
        <p className="text-sm text-text-muted">
          {index + 1} / {total}
        </p>
        <ProgressBar current={index} total={total} />
      </div>

      <FlipCard
        key={current.candidate_id}
        name={current.name}
        appeals={current.appeals}
        flipped={flipped}
        onToggle={onToggle}
      />
      <p className="text-center text-sm text-text-secondary">카드를 눌러 어필멘트를 확인해 보세요</p>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            onChoose("dislike");
          }}
        >
          👎 싫어
        </Button>
        <Button
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            onChoose("like");
          }}
        >
          💗 좋아
        </Button>
      </div>
    </div>
  );
}
