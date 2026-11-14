import { useCallback, useState } from "react";
import { ApiError, submitVotes } from "./api";
import type { Choice, PublicCandidate } from "./types";

export type VoteStage = "cards" | "veto" | "submitting";

const errorText = (e: unknown) =>
  e instanceof ApiError
    ? e.status === 0
      ? "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요."
      : e.detail
    : "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";

/**
 * 로컬 투표 진행 상태. App이 들고 있어서 2초 폴링으로 방 상태가 갱신되어도 초기화되지 않는다.
 */
export function useVoteProgress() {
  const [stage, setStage] = useState<VoteStage>("cards");
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [flipped, setFlipped] = useState(false);
  const [vetoId, setVetoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStage("cards");
    setIndex(0);
    setChoices({});
    setFlipped(false);
    setVetoId(null);
    setError(null);
  }, []);

  const toggleFlip = useCallback(() => setFlipped((f) => !f), []);

  const send = useCallback(
    async (
      roomCode: string,
      memberId: string,
      candidates: PublicCandidate[],
      picked: Record<string, Choice>,
      veto: string | null,
      refresh: () => void,
    ) => {
      setStage("submitting");
      setError(null);
      try {
        await submitVotes(roomCode, {
          member_id: memberId,
          votes: candidates.map((c) => ({ candidate_id: c.candidate_id, choice: picked[c.candidate_id] })),
          veto_candidate_id: veto,
        });
        refresh();
      } catch (e) {
        setError(errorText(e));
        // 선택 내용은 그대로 두고 거부권 화면에서 다시 제출할 수 있게 한다.
        setStage("veto");
      }
    },
    [],
  );

  /** 카드 한 장에 좋아/싫어를 고른다. 마지막 카드면 거부권 또는 바로 제출로 넘어간다. */
  const choose = useCallback(
    (
      choice: Choice,
      roomCode: string,
      memberId: string,
      candidates: PublicCandidate[],
      refresh: () => void,
    ) => {
      const current = candidates[index];
      if (!current) return;
      const next = { ...choices, [current.candidate_id]: choice };
      setChoices(next);
      setFlipped(false);
      if (index + 1 < candidates.length) {
        setIndex(index + 1);
        return;
      }
      setIndex(index + 1);
      const hasDislike = candidates.some((c) => next[c.candidate_id] === "dislike");
      if (hasDislike) {
        setStage("veto");
      } else {
        void send(roomCode, memberId, candidates, next, null, refresh);
      }
    },
    [choices, index, send],
  );

  const confirmVeto = useCallback(
    (
      veto: string | null,
      roomCode: string,
      memberId: string,
      candidates: PublicCandidate[],
      refresh: () => void,
    ) => send(roomCode, memberId, candidates, choices, veto, refresh),
    [choices, send],
  );

  return { stage, index, choices, flipped, vetoId, setVetoId, error, reset, toggleFlip, choose, confirmVeto };
}
