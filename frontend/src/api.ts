import type {
  CreateRoomReq,
  RoomState,
  SubmitCandidatesReq,
  SubmitVotesReq,
} from "./types";
import { ApiError } from "./apiError";
import * as mock from "./mock";

export { ApiError };

/** 백엔드가 준비되면 false로 바꾼다. */
export const USE_MOCK = false;

/** 환경변수가 우선, 없으면 localhost:8000 */
export const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.");
  }

  if (!res.ok) {
    let detail = "요청을 처리하지 못했어요.";
    if (res.status === 422) {
      detail = "요청 형식이 올바르지 않아요.";
    } else {
      try {
        const data = await res.json();
        if (typeof data?.detail === "string") detail = data.detail;
      } catch {
        // 본문이 JSON이 아니면 기본 문구를 쓴다.
      }
    }
    throw new ApiError(res.status, detail);
  }

  // POST /api/rooms, /join은 201이므로 2xx는 모두 성공으로 본다.
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(res.status, "서버 응답을 읽지 못했어요.");
  }
}

function roomPath(roomCode: string): string {
  return `/api/rooms/${encodeURIComponent(roomCode.trim().toUpperCase())}`;
}

export function createRoom(req: CreateRoomReq): Promise<{ room_code: string; member_id: string }> {
  if (USE_MOCK) return mock.mockCreateRoom(req);
  return request("POST", "/api/rooms", req);
}

export function joinRoom(roomCode: string, req: { nickname: string }): Promise<{ member_id: string }> {
  if (USE_MOCK) return mock.mockJoinRoom(roomCode, req);
  return request("POST", `${roomPath(roomCode)}/join`, req);
}

export function submitCandidates(roomCode: string, req: SubmitCandidatesReq): Promise<{ ok: true }> {
  if (USE_MOCK) return mock.mockSubmitCandidates(roomCode, req);
  return request("POST", `${roomPath(roomCode)}/candidates`, req);
}

export function startVoting(roomCode: string, req: { member_id: string }): Promise<{ ok: true }> {
  if (USE_MOCK) return mock.mockStartVoting(roomCode, req);
  return request("POST", `${roomPath(roomCode)}/start`, req);
}

export function submitVotes(roomCode: string, req: SubmitVotesReq): Promise<{ ok: true }> {
  if (USE_MOCK) return mock.mockSubmitVotes(roomCode, req);
  return request("POST", `${roomPath(roomCode)}/votes`, req);
}

export function getRoom(roomCode: string, memberId?: string): Promise<RoomState> {
  if (USE_MOCK) return mock.mockGetRoom(roomCode);
  const query = memberId ? `?member_id=${encodeURIComponent(memberId)}` : "";
  return request("GET", `${roomPath(roomCode)}${query}`);
}
