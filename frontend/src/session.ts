export interface Session {
  room_code: string;
  member_id: string;
  nickname: string;
}

const KEYS = ["room_code", "member_id", "nickname"] as const;

export function saveSession(s: Session): void {
  KEYS.forEach((k) => sessionStorage.setItem(k, s[k]));
}

export function loadSession(): Session | null {
  const room_code = sessionStorage.getItem("room_code");
  const member_id = sessionStorage.getItem("member_id");
  const nickname = sessionStorage.getItem("nickname");
  if (!room_code || !member_id || !nickname) return null;
  return { room_code, member_id, nickname };
}

export function clearSession(): void {
  KEYS.forEach((k) => sessionStorage.removeItem(k));
}
