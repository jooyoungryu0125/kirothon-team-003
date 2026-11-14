import { useState } from "react";
import type { RoomState } from "./types";
import { clearSession, loadSession } from "./session";
import { USE_MOCK } from "./api";
import { useRoomPolling } from "./useRoomPolling";
import MockPanel from "./components/MockPanel";
import InlineMessage from "./components/InlineMessage";
import Button from "./components/Button";
import Card from "./components/Card";
import Loading from "./components/Loading";
import Home from "./screens/Home";
import Lobby from "./screens/Lobby";
import CardVote from "./screens/CardVote";
import Veto from "./screens/Veto";
import Waiting from "./screens/Waiting";
import Result from "./screens/Result";

export type VoteStage = "cards" | "veto" | "submitting";
export type ScreenName = "home" | "notfound" | "result" | "waiting" | "cards" | "veto" | "lobby" | "loading";

/** design.md "화면 전환 규칙" 1~8번. 위에서부터 처음 맞는 규칙을 쓴다. */
export function pickScreen(opts: {
  hasSession: boolean;
  notFound: boolean;
  room: RoomState | null;
  myMemberId: string | null;
  stage: VoteStage;
}): ScreenName {
  const { hasSession, notFound, room, myMemberId, stage } = opts;
  if (!hasSession) return "home";
  if (notFound) return "notfound";
  if (!room) return "loading";
  if (room.status === "done") return "result";
  if (room.status === "voting") {
    const me = room.members.find((m) => m.member_id === myMemberId);
    if (me?.voted) return "waiting";
    if (stage === "cards") return "cards";
    if (stage === "veto") return "veto";
    return "waiting";
  }
  return "lobby";
}

export default function App() {
  const [session, setSession] = useState(loadSession);
  const { room, notFound, error, refresh } = useRoomPolling(
    session?.room_code ?? null,
    session?.member_id ?? null,
  );
  const [stage] = useState<VoteStage>("cards");

  const goHome = () => {
    clearSession();
    setSession(null);
  };

  const screen = pickScreen({
    hasSession: session !== null,
    notFound,
    room,
    myMemberId: session?.member_id ?? null,
    stage,
  });

  const isHome = screen === "home";

  return (
    <main className="mx-auto flex min-h-screen w-full flex-col items-center justify-center gap-4 px-4 py-8">
      <div className={`w-full ${isHome ? "max-w-3xl" : "max-w-md"}`}>
        {room && error && (
          <InlineMessage tone="info" message="연결이 불안정해요. 다시 시도하고 있어요." className="mb-2" />
        )}
        {screen === "home" && <Home onEntered={() => setSession(loadSession())} />}
        {screen === "loading" && <Loading />}
        {screen === "notfound" && (
          <Card className="flex flex-col gap-4">
            <p className="text-text-primary">방을 찾을 수 없어요.</p>
            <Button onClick={goHome}>홈으로 가기</Button>
          </Card>
        )}
        {screen === "lobby" && <Lobby />}
        {screen === "cards" && <CardVote />}
        {screen === "veto" && <Veto />}
        {screen === "waiting" && <Waiting />}
        {screen === "result" && <Result />}
      </div>
      {USE_MOCK && <MockPanel roomCode={session?.room_code ?? null} onChanged={refresh} />}
    </main>
  );
}
