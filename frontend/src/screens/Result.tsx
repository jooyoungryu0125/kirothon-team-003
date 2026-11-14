import { useEffect, useState } from "react";
import type { RoomResult, RoomState } from "../types";
import Button from "../components/Button";
import Card from "../components/Card";
import GorillaMascot from "../components/GorillaMascot";
import InlineMessage from "../components/InlineMessage";
import { GORILLA_LINES } from "../lib/gorillaLines";

interface Props {
  room: RoomState;
  /** 폴링 오류 문구 (있으면 결과가 없을 때 함께 보여준다) */
  error?: string | null;
  refresh: () => void;
  onNewGame: () => void;
}

const TIE_MS = 3000;
const DRUMROLL_MS = 5000;

type Phase = "tie" | "drumroll" | "reveal";

function initialPhase(result: RoomResult): Phase {
  return result.tied_candidates.length > 0 ? "tie" : "drumroll";
}

export default function Result({ room, error, refresh, onNewGame }: Props) {
  const result = room.result;

  if (!result) {
    return (
      <Card className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">{room.topic}</h1>
        <InlineMessage message={error ?? "결과를 불러오지 못했어요."} />
        <Button onClick={refresh}>다시 시도</Button>
      </Card>
    );
  }

  return <ResultBody topic={room.topic} result={result} onNewGame={onNewGame} />;
}

function ResultBody({
  topic,
  result,
  onNewGame,
}: {
  topic: string;
  result: RoomResult;
  onNewGame: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(() => initialPhase(result));
  const [seen, setSeen] = useState(result);

  // 결과 자체가 바뀐 경우에만 단계를 다시 정한다. 같은 결과의 재렌더링에서는 유지한다.
  if (seen !== result) {
    setSeen(result);
    setPhase(initialPhase(result));
  }

  useEffect(() => {
    if (phase === "reveal") return;
    const t = window.setTimeout(
      () => setPhase(phase === "tie" ? "drumroll" : "reveal"),
      phase === "tie" ? TIE_MS : DRUMROLL_MS,
    );
    return () => window.clearTimeout(t);
  }, [phase, result]);

  if (phase === "drumroll") {
    // 연출 중에는 1등 이름과 👑을 그리지 않는다.
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center" role="status">
        <p className="text-sm text-text-secondary">'{topic}'</p>
        <GorillaMascot size={144} className="animate-bounce motion-reduce:animate-none" />
        <p className="text-2xl font-bold tracking-tight text-text-primary">{GORILLA_LINES.drumroll}</p>
      </div>
    );
  }

  if (phase === "tie") {
    const list = result.tied_candidates;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm text-text-secondary">'{topic}'</p>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">⚖️ 동점이에요!</h1>
        </div>
        <div className={list.length === 2 ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4"}>
          {list.map((c) => (
            <Card key={c.name} className="flex flex-col gap-2 p-4">
              <p className="text-xl font-bold text-text-primary">{c.name}</p>
              {c.appeals.length === 0 ? (
                <p className="text-sm text-text-muted">어필 없이 등록된 후보예요 🤐</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {c.appeals.map((a, i) => (
                    <li key={i} className="rounded-2xl bg-pink-soft px-3 py-2 text-sm text-text-primary">
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-text-secondary">{GORILLA_LINES.tie}</p>
        <Button onClick={() => setPhase("drumroll")}>1등 공개하기</Button>
      </div>
    );
  }

  const rest = result.ranking.slice(1);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center text-2xl font-bold tracking-tight text-text-primary">
        '{topic}'의 결과는…
      </h1>
      <Card className="flex animate-grow-in flex-col gap-3 border-pink-light bg-pink-soft motion-reduce:animate-none">
        <div className="flex items-center justify-between gap-2">
          <p className="break-all text-4xl font-bold tracking-tight text-text-primary">👑 {result.winner}</p>
          <GorillaMascot size={96} className="shrink-0" />
        </div>
        {result.winner_appeals.length === 0 ? (
          <p className="text-sm text-text-secondary">어필 없이 등록된 후보예요 🤐</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {result.winner_appeals.map((a, i) => (
              <li key={i} className="rounded-2xl bg-surface px-3 py-2 text-base text-text-primary">
                {a}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm font-semibold text-accent">추천인 : {result.winner_added_by.join(", ")}</p>
      </Card>

      {rest.length > 0 && (
        <Card className="flex flex-col gap-2 p-4">
          <ul className="flex flex-col gap-2">
            {rest.map((r, i) => (
              <li
                key={`${r.name}-${i}`}
                className={`flex items-center justify-between gap-2 text-base text-text-primary ${
                  r.vetoed ? "opacity-50" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-6 text-sm text-text-muted">{i + 2}</span>
                  <span className="break-all">{r.name}</span>
                  {r.vetoed && <span aria-label="거부권을 받았어요">🚫</span>}
                </span>
                <span className="shrink-0 text-sm text-text-secondary">
                  💗 {r.likes} · 👎 {r.dislikes}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Button onClick={onNewGame}>새로 결정하기</Button>
    </div>
  );
}
