export type TopicType = "menu" | "movie" | "place" | "custom";
export type RoomStatus = "collecting" | "voting" | "done";
export type Choice = "like" | "dislike";

export interface CreateRoomReq {
  host_nickname: string;
  topic: string;
  topic_type: TopicType;
}

export interface SubmitCandidatesReq {
  member_id: string;
  candidates: { name: string; appeal: string }[]; // 0~3개
}

export interface SubmitVotesReq {
  member_id: string;
  votes: { candidate_id: string; choice: Choice }[];
  veto_candidate_id: string | null;
}

export interface Member {
  member_id: string;
  nickname: string;
  submitted: boolean;
  voted: boolean;
}

export interface PublicCandidate {
  candidate_id: string;
  name: string;
  appeals: string[];
}

export interface RankingItem {
  name: string;
  likes: number;
  dislikes: number;
  vetoed: boolean;
}

export interface TiedCandidate {
  name: string;
  appeals: string[];
}

export interface RoomResult {
  winner: string;
  winner_added_by: string[];
  winner_appeals: string[];
  tie_break: "random" | null;
  tied_candidates: TiedCandidate[];
  ranking: RankingItem[];
}

export interface RoomState {
  room_code: string;
  topic: string;
  topic_type: TopicType;
  status: RoomStatus;
  host_id: string;
  members: Member[];
  candidates: PublicCandidate[];
  result: RoomResult | null;
}

export interface ApiErrorBody {
  detail: string;
}
