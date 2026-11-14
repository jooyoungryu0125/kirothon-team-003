import { useEffect, useState } from "react";
import { ApiError, startVoting, submitCandidates } from "../api";
import type { RoomState, TopicType } from "../types";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import InlineMessage from "../components/InlineMessage";
import LimitedInput from "../components/LimitedInput";
import ProgressBar from "../components/ProgressBar";

interface Props {
  room: RoomState;
  myMemberId: string;
  /** 요청이 성공한 뒤 방 상태를 바로 다시 가져온다. */
  refresh: () => void;
}

const EXAMPLES: Record<TopicType, string> = {
  menu: "마라탕",
  movie: "인사이드 아웃",
  place: "가평",
  custom: "후보를 입력하세요",
};

interface Row {
  name: string;
  appeal: string;
}

const emptyRows = (): Row[] => [
  { name: "", appeal: "" },
  { name: "", appeal: "" },
  { name: "", appeal: "" },
];

const errorText = (e: unknown) =>
  e instanceof ApiError
    ? e.status === 0
      ? "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요."
      : e.detail
    : "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";

export default function Lobby({ room, myMemberId, refresh }: Props) {
  const [rows, setRows] = useState<Row[]>(emptyRows);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const me = room.members.find((m) => m.member_id === myMemberId);
  const submitted = me?.submitted ?? false;
  const isHost = room.host_id === myMemberId;
  const total = room.members.length;
  const done = room.members.filter((m) => m.submitted).length;
  const allSubmitted = total > 0 && done === total;

  // 방 상태나 참여자 제출 현황이 바뀌면 투표 시작 오류를 지운다.
  const membersKey = room.members.map((m) => `${m.member_id}:${m.submitted}`).join(",");
  useEffect(() => {
    setStartError(null);
  }, [room.status, membersKey]);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const submit = async () => {
    if (submitted || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const candidates = rows
      .filter((r) => r.name.trim() !== "")
      .map((r) => ({ name: r.name, appeal: r.appeal }));
    try {
      await submitCandidates(room.room_code, { member_id: myMemberId, candidates });
      refresh();
    } catch (e) {
      setSubmitError(errorText(e));
    } finally {
      setSubmitting(false);
    }
  };

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    try {
      await startVoting(room.room_code, { member_id: myMemberId });
      refresh();
    } catch (e) {
      setStartError(errorText(e));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">{room.topic}</h1>
        <button
          type="button"
          onClick={copyCode}
          aria-label={`방 코드 ${room.room_code} 복사하기`}
          className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Badge className="px-4 py-2 text-lg tracking-widest">방 코드 {room.room_code}</Badge>
        </button>
        <InlineMessage tone="success" message={copied ? "복사했어요" : null} />
      </div>

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-text-primary">
          {total}명 중 {done}명 제출 완료
        </p>
        <ProgressBar current={done} total={total} />
        <ul className="flex flex-col gap-2">
          {room.members.map((m) => (
            <li key={m.member_id} className="flex items-center justify-between text-base text-text-primary">
              <span>
                {m.nickname}
                {m.member_id === room.host_id && <span className="ml-1 text-xs text-text-muted">방장</span>}
              </span>
              {m.submitted ? (
                <Badge className="text-success">제출 완료 ✓</Badge>
              ) : (
                <span className="text-xs text-text-muted">작성 중</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-sm text-text-secondary">
        💡 표준 표기법으로 등록해 주세요. 글자가 같으면 같은 후보로 합쳐져요. (예: 떡볶이 ⭕ / 떡복이 ❌)
      </p>

      {rows.map((r, i) => (
        <Card key={i} className={`flex flex-col gap-3 ${submitted ? "bg-bg opacity-70" : ""}`}>
          <LimitedInput
            ariaLabel={`후보 ${i + 1} 이름`}
            value={r.name}
            onChange={(v) => setRow(i, { name: v })}
            maxLength={50}
            showCounter={false}
            placeholder={`예: ${EXAMPLES[room.topic_type]}`}
            disabled={submitted || submitting}
          />
          <LimitedInput
            ariaLabel={`후보 ${i + 1} 어필멘트`}
            value={r.appeal}
            onChange={(v) => setRow(i, { appeal: v })}
            maxLength={50}
            placeholder="어필멘트 (선택)"
            disabled={submitted || submitting}
          />
        </Card>
      ))}

      {submitted ? (
        <div className="flex flex-col items-center gap-2">
          <Badge className="text-success">제출 완료 ✓</Badge>
          <p className="text-sm text-text-secondary">다른 사람들이 제출하길 기다리고 있어요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button onClick={submit} loading={submitting}>
            제출하기
          </Button>
          <InlineMessage message={submitError} />
        </div>
      )}

      {isHost && (
        <div className="flex flex-col gap-2">
          <Button onClick={start} disabled={!allSubmitted} loading={starting}>
            투표 시작
          </Button>
          {!allSubmitted && (
            <InlineMessage tone="info" message="모두 제출하면 투표를 시작할 수 있어요." />
          )}
          <InlineMessage message={startError} />
        </div>
      )}
    </div>
  );
}
