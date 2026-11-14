import threading
from dataclasses import dataclass, field


@dataclass
class Member:
    member_id: str        # uuid4 문자열
    nickname: str
    submitted: bool = False
    voted: bool = False


@dataclass
class Candidate:          # 제출된 원본 후보 (내부용, API 응답 미노출)
    name: str
    appeal: str
    added_by: str         # 제출자 nickname
    order: int            # 방 전체에서 증가하는 등록 순서


@dataclass
class MergedCandidate:    # 투표 시작 후 확정된 후보
    candidate_id: str     # "c1", "c2", ...
    name: str
    appeals: list         # 비어 있지 않은 appeal만, 등록 순서대로
    added_by: list        # 내부용. result.winner_added_by에만 사용


@dataclass
class Vote:
    member_id: str
    votes: list           # [{"candidate_id": str, "choice": "like" | "dislike"}]
    veto_candidate_id: str | None


@dataclass
class Room:
    room_code: str
    topic: str
    topic_type: str
    status: str           # "collecting" | "voting" | "done"
    host_id: str
    members: list = field(default_factory=list)          # list[Member]
    raw_candidates: list = field(default_factory=list)   # list[Candidate]
    merged_candidates: list = field(default_factory=list) # list[MergedCandidate]
    votes: list = field(default_factory=list)            # list[Vote]
    result: dict | None = None
    _candidate_order_counter: int = field(default=0, repr=False)


# 메모리 저장소
rooms: dict[str, Room] = {}

# 동시 요청 보호용 Lock
rooms_lock = threading.Lock()
