import type {
  Choice,
  CreateRoomReq,
  Member,
  RoomResult,
  RoomState,
  RoomStatus,
  SubmitCandidatesReq,
  SubmitVotesReq,
  TopicType,
} from "./types";
import { ApiError } from "./apiError";

/**
 * 가짜 방. 진짜 백엔드와 같은 검증 순서, 같은 detail 문구, 같은 결과 규칙을 따른다.
 * 상태는 모듈 메모리에만 있다(새로고침하면 사라지고, 그러면 404가 된다).
 */

interface MockMember extends Member {
  bot: boolean;
}
interface RawCandidate {
  name: string;
  appeal: string;
  added_by: string;
  order: number;
}
interface MergedCandidate {
  candidate_id: string;
  name: string;
  appeals: string[];
  added_by: string[];
}
interface MockVote {
  member_id: string;
  votes: { candidate_id: string; choice: Choice }[];
  veto_candidate_id: string | null;
}
interface MockRoom {
  room_code: string;
  topic: string;
  topic_type: TopicType;
  status: RoomStatus;
  host_id: string;
  members: MockMember[];
  raw: RawCandidate[];
  merged: MergedCandidate[];
  votes: MockVote[];
  result: RoomResult | null;
  nextOrder: number;
}

export type JumpTarget = "collecting" | "voting" | "done-plain" | "done-tie";

const rooms = new Map<string, MockRoom>();

const TOPIC_TYPES: TopicType[] = ["menu", "movie", "place", "custom"];
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** 가짜 참여자가 자동으로 내는 후보 */
const BOT_NAMES = ["혜린", "민수"];
const BOT_CANDIDATES: Record<string, { name: string; appeal: string }[]> = {
  혜린: [
    { name: "마라탕", appeal: "추워서 얼큰한 거" },
    { name: "쌀국수", appeal: "" },
  ],
  민수: [
    { name: "마 라 탕", appeal: "어제부터 마라 생각뿐" },
    { name: "곱창", appeal: "" },
  ],
};

/** design.md 예시 데이터 */
const SAMPLE_MERGED: MergedCandidate[] = [
  {
    candidate_id: "c1",
    name: "마라탕",
    appeals: ["추워서 얼큰한 거", "어제부터 마라 생각뿐"],
    added_by: ["주영", "혜린"],
  },
  { candidate_id: "c2", name: "쌀국수", appeals: [], added_by: ["혜린"] },
  { candidate_id: "c3", name: "곱창", appeals: [], added_by: ["민수"] },
];

const SAMPLE_RESULT_PLAIN: RoomResult = {
  winner: "마라탕",
  winner_added_by: ["주영", "혜린"],
  winner_appeals: ["추워서 얼큰한 거", "어제부터 마라 생각뿐"],
  tie_break: null,
  tied_candidates: [],
  ranking: [
    { name: "마라탕", likes: 4, dislikes: 0, vetoed: false },
    { name: "쌀국수", likes: 2, dislikes: 2, vetoed: false },
    { name: "곱창", likes: 1, dislikes: 3, vetoed: true },
  ],
};

const SAMPLE_RESULT_TIE: RoomResult = {
  winner: "마라탕",
  winner_added_by: ["주영"],
  winner_appeals: ["추워서 얼큰한 거"],
  tie_break: "random",
  tied_candidates: [
    { name: "마라탕", appeals: ["추워서 얼큰한 거"] },
    { name: "쌀국수", appeals: ["국물이 필요해"] },
  ],
  ranking: [
    { name: "마라탕", likes: 3, dislikes: 1, vetoed: false },
    { name: "쌀국수", likes: 3, dislikes: 1, vetoed: false },
    { name: "곱창", likes: 1, dislikes: 3, vetoed: true },
  ],
};

// ---------- 도우미 ----------

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `m-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function normalize(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

function findRoom(roomCode: string): MockRoom {
  const room = rooms.get(roomCode.trim().toUpperCase());
  if (!room) throw new ApiError(404, "방을 찾을 수 없어요.");
  return room;
}

function validNickname(nickname: string): string {
  const n = nickname.trim();
  if (n.length < 1 || n.length > 10) {
    throw new ApiError(400, "닉네임은 1~10자로 입력해 주세요.");
  }
  return n;
}

function requireMember(room: MockRoom, memberId: string): MockMember {
  const me = room.members.find((m) => m.member_id === memberId);
  if (!me) throw new ApiError(403, "이 방의 참여자가 아니에요.");
  return me;
}

function addRaw(room: MockRoom, nickname: string, list: { name: string; appeal: string }[]): void {
  for (const c of list) {
    room.raw.push({ name: c.name.trim(), appeal: c.appeal.trim(), added_by: nickname, order: room.nextOrder++ });
  }
}

function mergeCandidates(raw: RawCandidate[]): MergedCandidate[] {
  const groups = new Map<string, MergedCandidate>();
  const sorted = [...raw].sort((a, b) => a.order - b.order);
  for (const c of sorted) {
    const key = normalize(c.name);
    let m = groups.get(key);
    if (!m) {
      m = { candidate_id: "", name: c.name, appeals: [], added_by: [] };
      groups.set(key, m);
    }
    if (c.appeal !== "") m.appeals.push(c.appeal);
    if (!m.added_by.includes(c.added_by)) m.added_by.push(c.added_by);
  }
  const merged = Array.from(groups.values());
  merged.forEach((m, i) => {
    m.candidate_id = `c${i + 1}`;
  });
  return merged;
}

function computeResult(room: MockRoom): RoomResult {
  const cands = room.merged;
  const stats = new Map<string, { likes: number; dislikes: number; vetoes: number }>();
  cands.forEach((c) => stats.set(c.candidate_id, { likes: 0, dislikes: 0, vetoes: 0 }));

  for (const v of room.votes) {
    for (const item of v.votes) {
      const s = stats.get(item.candidate_id);
      if (!s) continue;
      if (item.choice === "like") s.likes += 1;
      else s.dislikes += 1;
    }
    if (v.veto_candidate_id !== null) {
      const s = stats.get(v.veto_candidate_id);
      if (s) s.vetoes += 1;
    }
  }

  const st = (c: MergedCandidate) => stats.get(c.candidate_id)!;
  const isVetoed = (c: MergedCandidate) => st(c).vetoes >= 1;
  const cmp = (a: MergedCandidate, b: MergedCandidate) =>
    st(b).likes - st(a).likes || st(a).dislikes - st(b).dislikes;

  let pool = cands.filter((c) => !isVetoed(c));
  if (pool.length === 0) {
    const least = Math.min(...cands.map((c) => st(c).vetoes));
    pool = cands.filter((c) => st(c).vetoes === least);
  }
  let poolSorted = [...pool].sort(cmp);
  const restSorted = cands.filter((c) => !pool.includes(c)).sort(cmp);

  const tied = poolSorted.filter((c) => cmp(c, poolSorted[0]) === 0);
  let winner: MergedCandidate;
  let tieBreak: "random" | null = null;
  let tiedCandidates: RoomResult["tied_candidates"] = [];
  if (tied.length >= 2) {
    winner = tied[Math.floor(Math.random() * tied.length)];
    tieBreak = "random";
    tiedCandidates = tied.map((c) => ({ name: c.name, appeals: [...c.appeals] }));
    poolSorted = [winner, ...poolSorted.filter((c) => c !== winner)];
  } else {
    winner = poolSorted[0];
  }

  return {
    winner: winner.name,
    winner_added_by: [...winner.added_by],
    winner_appeals: [...winner.appeals],
    tie_break: tieBreak,
    tied_candidates: tiedCandidates,
    ranking: [...poolSorted, ...restSorted].map((c) => ({
      name: c.name,
      likes: st(c).likes,
      dislikes: st(c).dislikes,
      vetoed: isVetoed(c),
    })),
  };
}

function finishIfAllVoted(room: MockRoom): void {
  if (room.status === "voting" && room.members.every((m) => m.voted)) {
    room.result = computeResult(room);
    room.status = "done";
  }
}

// ---------- 가짜 참여자 ----------

function scheduleBotSubmits(room: MockRoom): void {
  room.members
    .filter((m) => m.bot)
    .forEach((bot, k) => {
      setTimeout(() => {
        if (room.status !== "collecting" || bot.submitted) return;
        addRaw(room, bot.nickname, BOT_CANDIDATES[bot.nickname] ?? []);
        bot.submitted = true;
      }, 2500 + k * 2000);
    });
}

function scheduleBotVotes(room: MockRoom): void {
  room.members
    .filter((m) => m.bot)
    .forEach((bot, k) => {
      setTimeout(() => {
        if (room.status !== "voting" || bot.voted) return;
        const votes = room.merged.map((c, i) => ({
          candidate_id: c.candidate_id,
          choice: ((i + k) % 3 === 2 ? "dislike" : "like") as Choice,
        }));
        room.votes.push({ member_id: bot.member_id, votes, veto_candidate_id: null });
        bot.voted = true;
        finishIfAllVoted(room);
      }, 4000 + k * 3000);
    });
}

// ---------- API 흉내 ----------

export async function mockCreateRoom(req: CreateRoomReq): Promise<{ room_code: string; member_id: string }> {
  await delay(150);
  const nickname = validNickname(req.host_nickname);
  if (!TOPIC_TYPES.includes(req.topic_type)) {
    throw new ApiError(400, "주제 종류가 올바르지 않아요.");
  }
  const topic = req.topic.trim();
  if (topic.length < 1 || topic.length > 50) {
    throw new ApiError(400, "주제는 1~50자로 입력해 주세요.");
  }

  let code = "";
  for (let i = 0; i < 20; i++) {
    let c = "";
    for (let j = 0; j < 4; j++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) {
      code = c;
      break;
    }
  }
  if (!code) throw new ApiError(503, "방 코드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");

  const hostId = uid();
  const members: MockMember[] = [
    { member_id: hostId, nickname, submitted: false, voted: false, bot: false },
    ...BOT_NAMES.filter((n) => n !== nickname).map((n) => ({
      member_id: uid(),
      nickname: n,
      submitted: false,
      voted: false,
      bot: true,
    })),
  ];
  const room: MockRoom = {
    room_code: code,
    topic,
    topic_type: req.topic_type,
    status: "collecting",
    host_id: hostId,
    members,
    raw: [],
    merged: [],
    votes: [],
    result: null,
    nextOrder: 1,
  };
  rooms.set(code, room);
  scheduleBotSubmits(room);
  return { room_code: code, member_id: hostId };
}

export async function mockJoinRoom(roomCode: string, req: { nickname: string }): Promise<{ member_id: string }> {
  await delay(150);
  const room = findRoom(roomCode);
  const nickname = validNickname(req.nickname);
  if (room.status !== "collecting") throw new ApiError(409, "이미 투표가 시작된 방이에요.");
  if (room.members.length >= 6) throw new ApiError(409, "방이 가득 찼어요. (최대 6명)");
  if (room.members.some((m) => m.nickname === nickname)) {
    throw new ApiError(409, "이미 같은 닉네임이 있어요.");
  }
  const member: MockMember = { member_id: uid(), nickname, submitted: false, voted: false, bot: false };
  room.members.push(member);
  return { member_id: member.member_id };
}

export async function mockSubmitCandidates(roomCode: string, req: SubmitCandidatesReq): Promise<{ ok: true }> {
  await delay(150);
  const room = findRoom(roomCode);
  const me = requireMember(room, req.member_id);
  if (room.status !== "collecting") throw new ApiError(409, "지금은 후보를 제출할 수 없어요.");
  if (me.submitted) throw new ApiError(409, "이미 후보를 제출했어요.");
  if (req.candidates.length > 3) throw new ApiError(400, "후보는 한 번에 최대 3개까지 낼 수 있어요.");
  const kept = req.candidates.filter((c) => c.name.trim() !== "");
  for (const c of kept) {
    if (c.name.trim().length > 50) throw new ApiError(400, "후보 이름은 50자 이하로 입력해 주세요.");
    if (c.appeal.trim().length > 50) throw new ApiError(400, "어필멘트는 50자 이하로 입력해 주세요.");
  }
  addRaw(room, me.nickname, kept);
  me.submitted = true;
  return { ok: true };
}

export async function mockStartVoting(roomCode: string, req: { member_id: string }): Promise<{ ok: true }> {
  await delay(150);
  const room = findRoom(roomCode);
  if (!req.member_id || req.member_id !== room.host_id) {
    throw new ApiError(403, "방장만 투표를 시작할 수 있어요.");
  }
  if (room.status !== "collecting") throw new ApiError(409, "지금은 투표를 시작할 수 없어요.");
  if (!room.members.every((m) => m.submitted)) {
    throw new ApiError(409, "아직 후보를 제출하지 않은 사람이 있어요.");
  }
  const merged = mergeCandidates(room.raw);
  if (merged.length < 2) {
    throw new ApiError(
      409,
      "중복을 합치고 나니 후보가 2개 미만이에요. 새 참여자를 기다리거나 새 방을 만들어 주세요.",
    );
  }
  room.merged = merged;
  room.status = "voting";
  scheduleBotVotes(room);
  return { ok: true };
}

export async function mockSubmitVotes(roomCode: string, req: SubmitVotesReq): Promise<{ ok: true }> {
  await delay(150);
  const room = findRoom(roomCode);
  const me = requireMember(room, req.member_id);
  if (room.status !== "voting") throw new ApiError(409, "지금은 투표할 수 없어요.");
  if (me.voted) throw new ApiError(409, "이미 투표를 제출했어요.");

  const ids = room.merged.map((c) => c.candidate_id);
  const seen = new Set<string>();
  let ok = req.votes.length === ids.length;
  for (const v of req.votes) {
    if (!ids.includes(v.candidate_id) || seen.has(v.candidate_id)) ok = false;
    if (v.choice !== "like" && v.choice !== "dislike") ok = false;
    seen.add(v.candidate_id);
  }
  if (!ok) throw new ApiError(400, "모든 후보에 좋아요 또는 싫어요를 한 번씩 골라 주세요.");

  if (req.veto_candidate_id !== null) {
    const disliked = req.votes.some((v) => v.candidate_id === req.veto_candidate_id && v.choice === "dislike");
    if (!disliked) throw new ApiError(409, "거부권은 내가 싫어한 후보에게만 쓸 수 있어요.");
  }

  room.votes.push({
    member_id: me.member_id,
    votes: req.votes.map((v) => ({ candidate_id: v.candidate_id, choice: v.choice })),
    veto_candidate_id: req.veto_candidate_id,
  });
  me.voted = true;
  finishIfAllVoted(room);
  return { ok: true };
}

export async function mockGetRoom(roomCode: string): Promise<RoomState> {
  await delay(80);
  const room = findRoom(roomCode);
  const state: RoomState = {
    room_code: room.room_code,
    topic: room.topic,
    topic_type: room.topic_type,
    status: room.status,
    host_id: room.host_id,
    members: room.members.map((m) => ({
      member_id: m.member_id,
      nickname: m.nickname,
      submitted: m.submitted,
      voted: m.voted,
    })),
    candidates:
      room.status === "collecting"
        ? []
        : room.merged.map((c) => ({ candidate_id: c.candidate_id, name: c.name, appeals: [...c.appeals] })),
    result: room.status === "done" ? room.result : null,
  };
  return clone(state);
}

// ---------- 개발용 패널 ----------

/** 현재 방의 단계와 결과 종류를 바로 바꾼다. USE_MOCK일 때만 화면의 개발용 패널이 쓴다. */
export function mockJumpTo(roomCode: string, target: JumpTarget): void {
  const room = findRoom(roomCode);
  room.votes = [];
  room.result = null;

  if (target === "collecting") {
    room.status = "collecting";
    room.raw = [];
    room.merged = [];
    room.nextOrder = 1;
    room.members.forEach((m) => {
      m.submitted = false;
      m.voted = false;
    });
    scheduleBotSubmits(room);
    return;
  }

  room.merged = clone(SAMPLE_MERGED);
  room.members.forEach((m) => {
    m.submitted = true;
    m.voted = false;
  });

  if (target === "voting") {
    room.status = "voting";
    scheduleBotVotes(room);
    return;
  }

  room.members.forEach((m) => {
    m.voted = true;
  });
  room.result = clone(target === "done-tie" ? SAMPLE_RESULT_TIE : SAMPLE_RESULT_PLAIN);
  room.status = "done";
}
