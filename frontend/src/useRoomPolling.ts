import { useCallback, useEffect, useState } from "react";
import type { RoomState } from "./types";
import { ApiError, getRoom } from "./api";

const POLL_MS = 2000;

/**
 * 2초마다 방 상태를 가져온다.
 * - 네트워크 오류: 마지막 성공 상태(room)를 그대로 두고 다음 주기에 다시 호출한다.
 * - 404: 폴링을 멈추고 notFound를 true로 한다.
 * - done: 폴링을 멈춘다. refresh()로 다시 시작할 수 있다.
 * 카드 위치, 선택 기록, 입력값 같은 화면 상태는 여기에 없고 각 화면이 따로 가진다.
 */
export function useRoomPolling(roomCode: string | null, memberId: string | null) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // 방이나 사용자가 바뀌면 이전 데이터를 비운다.
  useEffect(() => {
    setRoom(null);
    setNotFound(false);
    setError(null);
  }, [roomCode, memberId]);

  useEffect(() => {
    if (!roomCode || !memberId) return;
    let cancelled = false;
    let timer: number | undefined;
    setNotFound(false);

    const tick = async () => {
      try {
        const next = await getRoom(roomCode, memberId);
        if (cancelled) return;
        setRoom(next);
        setError(null);
        if (next.status === "done") return;
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          setNotFound(true);
          return;
        }
        setError(e instanceof ApiError ? e.detail : "연결이 불안정해요.");
      }
      timer = window.setTimeout(tick, POLL_MS);
    };
    void tick();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [roomCode, memberId, nonce]);

  /** 폴링을 처음부터 다시 시작해 바로 한 번 가져온다. */
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { room, notFound, error, refresh };
}
