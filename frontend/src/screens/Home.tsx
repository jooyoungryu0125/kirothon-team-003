import { useState } from "react";
import { ApiError, createRoom, joinRoom } from "../api";
import { saveSession } from "../session";
import type { TopicType } from "../types";
import Button from "../components/Button";
import Card from "../components/Card";
import GorillaMascot from "../components/GorillaMascot";
import InlineMessage from "../components/InlineMessage";
import LimitedInput from "../components/LimitedInput";

interface Props {
  /** 방 만들기 또는 참여에 성공해 세션을 저장한 뒤 호출한다. */
  onEntered: () => void;
}

type Mode = "none" | "create" | "join";

const TOPICS: { type: TopicType; label: string; text: string }[] = [
  { type: "menu", label: "🍽️ 메뉴", text: "오늘 뭐 먹지?" },
  { type: "movie", label: "🎬 영화", text: "오늘 뭐 볼까?" },
  { type: "place", label: "📍 장소", text: "어디 갈까?" },
  { type: "custom", label: "✏️ 직접 입력", text: "" },
];

const toRoomCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "");

export default function Home({ onEntered }: Props) {
  const [mode, setMode] = useState<Mode>("none");
  const [nickname, setNickname] = useState("");
  const [topicType, setTopicType] = useState<TopicType | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const nicknameOk = nickname.trim().length >= 1;
  const topicText =
    topicType === "custom"
      ? customTopic.trim()
      : (TOPICS.find((t) => t.type === topicType)?.text ?? "");
  const canSubmit =
    nicknameOk && (mode === "create" ? topicType !== null && topicText.length >= 1 : roomCode.length === 4);

  const submit = async () => {
    if (!canSubmit || loading || topicType === null && mode === "create") return;
    setLoading(true);
    setError(null);
    const name = nickname.trim();
    try {
      if (mode === "create" && topicType !== null) {
        const res = await createRoom({ host_nickname: name, topic: topicText, topic_type: topicType });
        saveSession({ room_code: res.room_code, member_id: res.member_id, nickname: name });
      } else {
        const res = await joinRoom(roomCode, { nickname: name });
        saveSession({ room_code: roomCode, member_id: res.member_id, nickname: name });
      }
      onEntered();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.status === 0 ? "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요." : e.detail);
      } else {
        setError("문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex items-end justify-center gap-2">
        <GorillaMascot size={140} />
        <span className="mb-20 rounded-2xl border border-border bg-surface px-3 py-1 text-sm text-text-secondary">
          고릴래?
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-bold tracking-tight text-text-primary sm:text-6xl">아무거나 말고</h1>
        <p className="text-base text-text-secondary">아무거나 말고, 다 같이 정해요</p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <Button onClick={() => chooseMode("create")} disabled={loading} className="h-16 text-lg">
          방 만들기
        </Button>
        <Button
          variant="secondary"
          onClick={() => chooseMode("join")}
          disabled={loading}
          className="h-16 text-lg"
        >
          코드로 참여하기
        </Button>
      </div>

      {mode !== "none" && (
        <Card className="flex w-full max-w-md flex-col gap-4 text-left">
          <label htmlFor="nickname" className="text-sm font-semibold text-text-primary">
            닉네임
          </label>
          <LimitedInput
            id="nickname"
            value={nickname}
            onChange={setNickname}
            maxLength={10}
            placeholder="닉네임은 한 글자 이상 입력해주세요."
            disabled={loading}
          />

          {mode === "create" && (
            <>
              <p className="text-sm font-semibold text-text-primary">무엇을 정할까요?</p>
              <div className="grid grid-cols-2 gap-2">
                {TOPICS.map((t) => {
                  const selected = topicType === t.type;
                  return (
                    <button
                      key={t.type}
                      type="button"
                      disabled={loading}
                      aria-pressed={selected}
                      onClick={() => setTopicType(t.type)}
                      className={`h-12 rounded-full border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        selected
                          ? "border-accent bg-pink-soft text-accent"
                          : "border-border bg-surface text-text-primary"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              {topicType === "custom" && (
                <LimitedInput
                  ariaLabel="주제"
                  value={customTopic}
                  onChange={setCustomTopic}
                  maxLength={50}
                  showCounter={false}
                  placeholder="예: 주말에 뭐 할까?"
                  disabled={loading}
                />
              )}
              {topicType !== null && topicType !== "custom" && (
                <p className="text-sm text-text-secondary">주제: {topicText}</p>
              )}
            </>
          )}

          {mode === "join" && (
            <>
              <label htmlFor="room_code" className="text-sm font-semibold text-text-primary">
                방 코드
              </label>
              <LimitedInput
                id="room_code"
                value={roomCode}
                onChange={setRoomCode}
                maxLength={4}
                transform={toRoomCode}
                placeholder="예: A7K2"
                disabled={loading}
              />
            </>
          )}

          <InlineMessage message={error} />
          <Button onClick={submit} disabled={!canSubmit} loading={loading}>
            {mode === "create" ? "방 만들기" : "참여하기"}
          </Button>
        </Card>
      )}
    </div>
  );
}
