from typing import Literal
from pydantic import BaseModel


# ── 요청 모델 ──────────────────────────────────────────────

class CreateRoomRequest(BaseModel):
    host_nickname: str
    topic: str
    topic_type: Literal["menu", "movie", "place", "custom"]


class JoinRoomRequest(BaseModel):
    nickname: str


class CandidateItem(BaseModel):
    name: str
    appeal: str = ""


class SubmitCandidatesRequest(BaseModel):
    member_id: str
    candidates: list[CandidateItem]


class StartVotingRequest(BaseModel):
    member_id: str


class VoteItem(BaseModel):
    candidate_id: str
    choice: Literal["like", "dislike"]


class SubmitVotesRequest(BaseModel):
    member_id: str
    votes: list[VoteItem]
    veto_candidate_id: str | None = None


# ── 응답 모델 ──────────────────────────────────────────────

class CreateRoomResponse(BaseModel):
    room_code: str
    member_id: str


class JoinRoomResponse(BaseModel):
    member_id: str


class OkResponse(BaseModel):
    ok: bool = True


class MemberResponse(BaseModel):
    member_id: str
    nickname: str
    submitted: bool
    voted: bool


class CandidateResponse(BaseModel):
    candidate_id: str
    name: str
    appeals: list[str]


class RankingItem(BaseModel):
    name: str
    likes: int
    dislikes: int
    vetoed: bool


class TiedCandidate(BaseModel):
    name: str
    appeals: list[str]


class RoomResult(BaseModel):
    winner: str
    winner_added_by: list[str]
    winner_appeals: list[str]
    tie_break: str | None
    tied_candidates: list[TiedCandidate]
    ranking: list[RankingItem]


class RoomStateResponse(BaseModel):
    room_code: str
    topic: str
    topic_type: str
    status: str
    host_id: str
    members: list[MemberResponse]
    candidates: list[CandidateResponse]
    result: RoomResult | None
