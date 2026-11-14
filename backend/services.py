"""
services.py — 검증, 중복 통합, 결과 계산
상태를 바꾸는 모든 함수는 store.rooms_lock을 획득한 뒤 호출된다.
"""

import random
import re
import string
import uuid

from errors import ApiError
from store import (
    Candidate,
    MergedCandidate,
    Member,
    Room,
    Vote,
    rooms,
)

VALID_TOPIC_TYPES = {"menu", "movie", "place", "custom"}
ROOM_CODE_CHARS = string.ascii_uppercase + string.digits
ROOM_CODE_MAX_TRIES = 20


# ── 유틸 ───────────────────────────────────────────────────

def _new_uuid() -> str:
    return str(uuid.uuid4())


def _generate_room_code() -> str:
    """겹치지 않는 4자리 방 코드를 발급한다. 20회 실패 시 ApiError(503)."""
    for _ in range(ROOM_CODE_MAX_TRIES):
        code = "".join(random.choices(ROOM_CODE_CHARS, k=4))
        if code not in rooms:
            return code
    raise ApiError(503, "방 코드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.")


def _get_room(room_code: str) -> Room:
    """방이 없으면 ApiError(404)."""
    key = room_code.strip().upper()
    room = rooms.get(key)
    if room is None:
        raise ApiError(404, "방을 찾을 수 없어요.")
    return room


def _validate_nickname(nickname: str) -> str:
    """공백 제거 후 1~10자 검증. 통과하면 원본 nickname 반환."""
    if not nickname or not nickname.strip():
        raise ApiError(400, "닉네임을 입력해 주세요.")
    if len(nickname) > 10:
        raise ApiError(400, "닉네임은 10자 이하로 입력해 주세요.")
    return nickname


def normalize(name: str) -> str:
    """앞·뒤·중간 공백 제거 + 영문 소문자 변환."""
    return re.sub(r"\s+", "", name).lower()


# ── 서비스 함수 ────────────────────────────────────────────

def create_room(host_nickname: str, topic: str, topic_type: str) -> dict:
    """
    POST /api/rooms
    검증 순서: 닉네임 → topic_type → topic → 방 코드 발급
    """
    # 1) 닉네임 검증
    _validate_nickname(host_nickname)

    # 2) topic_type 검증
    if topic_type not in VALID_TOPIC_TYPES:
        raise ApiError(400, "주제 종류가 올바르지 않아요. menu, movie, place, custom 중 하나여야 해요.")

    # 3) topic 검증
    if not topic or not topic.strip():
        raise ApiError(400, "주제를 입력해 주세요.")
    if len(topic) > 50:
        raise ApiError(400, "주제는 50자 이하로 입력해 주세요.")

    # 4) 방 코드 발급
    room_code = _generate_room_code()
    member_id = _new_uuid()

    room = Room(
        room_code=room_code,
        topic=topic,
        topic_type=topic_type,
        status="collecting",
        host_id=member_id,
        members=[Member(member_id=member_id, nickname=host_nickname)],
    )
    rooms[room_code] = room

    return {"room_code": room_code, "member_id": member_id}


def join_room(room_code: str, nickname: str) -> dict:
    """
    POST /api/rooms/{room_code}/join
    검증 순서: 방 존재 → 닉네임 → collecting → 인원 → 닉네임 중복
    """
    # 1) 방 존재
    room = _get_room(room_code)

    # 2) 닉네임 검증
    _validate_nickname(nickname)

    # 3) status가 collecting
    if room.status != "collecting":
        raise ApiError(409, "지금은 참여를 받지 않는 상태예요.")

    # 4) 인원 6명 미만
    if len(room.members) >= 6:
        raise ApiError(409, "방이 가득 찼어요. (최대 6명)")

    # 5) 닉네임 중복
    if any(m.nickname == nickname for m in room.members):
        raise ApiError(409, "이미 같은 닉네임이 있어요.")

    member_id = _new_uuid()
    room.members.append(Member(member_id=member_id, nickname=nickname))

    return {"member_id": member_id}


def submit_candidates(room_code: str, member_id: str, candidates: list) -> dict:
    """
    POST /api/rooms/{room_code}/candidates
    검증 순서: 방 존재 → 참여자 → collecting → 미제출 → 개수 → 이름/appeal 길이 → 저장
    candidates: [{"name": str, "appeal": str}]
    """
    # 1) 방 존재
    room = _get_room(room_code)

    # 2) member_id가 방의 참여자
    member = next((m for m in room.members if m.member_id == member_id), None)
    if member is None:
        raise ApiError(403, "이 방의 참여자가 아니에요.")

    # 3) status가 collecting
    if room.status != "collecting":
        raise ApiError(409, "지금은 후보를 제출할 수 없어요.")

    # 4) 아직 제출 안 함
    if member.submitted:
        raise ApiError(409, "이미 후보를 제출했어요.")

    # 5) 요청 후보 개수 3개 이하 (빈 이름 후보도 개수에 포함)
    if len(candidates) > 3:
        raise ApiError(400, "후보는 최대 3개까지 제출할 수 있어요.")

    # 6) 이름이 비지 않은 후보의 이름 50자 이하, appeal 50자 이하
    for c in candidates:
        if c["name"].strip():  # 빈 이름이 아닌 경우만 검증
            if len(c["name"]) > 50:
                raise ApiError(400, "후보 이름은 50자 이하로 입력해 주세요.")
        if len(c["appeal"]) > 50:
            raise ApiError(400, "어필멘트는 50자 이하로 입력해 주세요.")

    # 7) 빈 이름 후보를 제외하고 저장
    nickname = member.nickname
    saved = 0
    for c in candidates:
        if not c["name"].strip():
            continue  # 빈 이름 후보 조용히 무시
        room._candidate_order_counter += 1
        room.raw_candidates.append(
            Candidate(
                name=c["name"],
                appeal=c["appeal"],
                added_by=nickname,
                order=room._candidate_order_counter,
            )
        )
        saved += 1

    member.submitted = True
    return {"ok": True}


def start_voting(room_code: str, member_id: str) -> dict:
    """
    POST /api/rooms/{room_code}/start
    검증 순서: 방 존재 → host_id 일치 → collecting → 전원 submitted → 통합 후 2개 이상 → 확정
    """
    # 1) 방 존재
    room = _get_room(room_code)

    # 2) member_id == host_id
    if not member_id or member_id != room.host_id:
        raise ApiError(403, "방장만 투표를 시작할 수 있어요.")

    # 3) status가 collecting
    if room.status != "collecting":
        raise ApiError(409, "지금은 투표를 시작할 수 없는 상태예요.")

    # 4) 전원 submitted
    if not all(m.submitted for m in room.members):
        raise ApiError(409, "아직 후보를 제출하지 않은 사람이 있어요.")

    # 5) 중복 통합 후 후보 2개 이상
    merged = merge_candidates(room.raw_candidates)
    if len(merged) < 2:
        raise ApiError(
            409,
            "중복을 합치고 나니 후보가 2개 미만이에요. 새 참여자를 기다리거나 새 방을 만들어 주세요.",
        )

    # 6) 통합 확정, voting으로 변경
    room.merged_candidates = merged
    room.status = "voting"

    return {"ok": True}


def submit_votes(
    room_code: str,
    member_id: str,
    votes: list,
    veto_candidate_id: str | None,
) -> dict:
    """
    POST /api/rooms/{room_code}/votes
    검증 순서: 방 존재 → 참여자 → voting → 미투표 → 항목 완전성 → veto 유효성 → 저장 → (전원이면 결과 계산)
    votes: [{"candidate_id": str, "choice": "like" | "dislike"}]
    """
    # 1) 방 존재
    room = _get_room(room_code)

    # 2) member_id가 방의 참여자
    member = next((m for m in room.members if m.member_id == member_id), None)
    if member is None:
        raise ApiError(403, "이 방의 참여자가 아니에요.")

    # 3) status가 voting
    if room.status != "voting":
        raise ApiError(409, "지금은 투표를 제출할 수 없어요.")

    # 4) 아직 투표 안 함
    if member.voted:
        raise ApiError(409, "이미 투표를 제출했어요.")

    # 5) 모든 후보를 정확히 한 번씩, choice가 유효
    merged_ids = {c.candidate_id for c in room.merged_candidates}
    submitted_ids = [v["candidate_id"] for v in votes]

    if set(submitted_ids) != merged_ids or len(submitted_ids) != len(merged_ids):
        raise ApiError(400, "모든 후보에 대해 정확히 한 번씩 투표해야 해요.")

    for v in votes:
        if v["choice"] not in ("like", "dislike"):
            raise ApiError(400, "투표 선택은 like 또는 dislike여야 해요.")

    # 6) veto_candidate_id가 null이거나 본인이 dislike한 후보
    if veto_candidate_id is not None:
        disliked_ids = {v["candidate_id"] for v in votes if v["choice"] == "dislike"}
        if veto_candidate_id not in disliked_ids:
            raise ApiError(409, "거부권은 본인이 싫어요를 선택한 후보에게만 행사할 수 있어요.")
        if veto_candidate_id not in merged_ids:
            raise ApiError(409, "거부권 대상 후보를 찾을 수 없어요.")

    # 7) 저장
    room.votes.append(
        Vote(
            member_id=member_id,
            votes=list(votes),
            veto_candidate_id=veto_candidate_id,
        )
    )
    member.voted = True

    # 8) 전원 voted이면 결과 계산
    if all(m.voted for m in room.members):
        room.result = compute_result(room)
        room.status = "done"

    return {"ok": True}


def get_room_state(room_code: str) -> dict:
    """
    GET /api/rooms/{room_code}
    상태별 candidates, result 공개 규칙을 적용한다.
    """
    room = _get_room(room_code)

    # candidates 공개 규칙
    if room.status == "collecting":
        candidates = []
    else:
        # voting, done: candidate_id, name, appeals만 (추천인 없음)
        candidates = [
            {
                "candidate_id": c.candidate_id,
                "name": c.name,
                "appeals": list(c.appeals),
            }
            for c in room.merged_candidates
        ]

    # result 공개 규칙
    result = room.result if room.status == "done" else None

    return {
        "room_code": room.room_code,
        "topic": room.topic,
        "topic_type": room.topic_type,
        "status": room.status,
        "host_id": room.host_id,
        "members": [
            {
                "member_id": m.member_id,
                "nickname": m.nickname,
                "submitted": m.submitted,
                "voted": m.voted,
            }
            for m in room.members
        ],
        "candidates": candidates,
        "result": result,
    }


# ── 중복 통합 알고리즘 ──────────────────────────────────────

def merge_candidates(raw_candidates: list) -> list:
    """
    raw_candidates: Candidate 목록 (order 기준 정렬된 상태)
    반환: list[MergedCandidate]
    """
    # order 기준으로 정렬 (등록 순서 보장)
    sorted_candidates = sorted(raw_candidates, key=lambda c: c.order)

    groups: dict[str, MergedCandidate] = {}  # normalized_name → MergedCandidate

    for c in sorted_candidates:
        key = normalize(c.name)
        if key not in groups:
            groups[key] = MergedCandidate(
                candidate_id="",        # 아래에서 채움
                name=c.name,            # 가장 먼저 제출된 표기
                appeals=[],
                added_by=[],
            )
        m = groups[key]

        # 빈 문자열 appeal은 포함하지 않음
        if c.appeal != "":
            m.appeals.append(c.appeal)

        # 추천인 중복 없이 기록
        if c.added_by not in m.added_by:
            m.added_by.append(c.added_by)

    merged = list(groups.values())
    for i, m in enumerate(merged, start=1):
        m.candidate_id = f"c{i}"

    return merged


# ── 결과 계산 알고리즘 ──────────────────────────────────────

def compute_result(room: Room) -> dict:
    """
    모든 Member의 voted가 true가 되는 순간 호출된다.
    design.md의 결과 계산 의사코드를 그대로 구현한다.
    """
    cands = room.merged_candidates  # 등록 순서 유지

    stats: dict[str, dict] = {}
    for c in cands:
        stats[c.candidate_id] = {"likes": 0, "dislikes": 0, "vetoes": 0}

    for v in room.votes:
        for item in v.votes:
            key = "likes" if item["choice"] == "like" else "dislikes"
            stats[item["candidate_id"]][key] += 1
        if v.veto_candidate_id is not None:
            stats[v.veto_candidate_id]["vetoes"] += 1

    vetoed = {cid for cid, s in stats.items() if s["vetoes"] >= 1}

    # 1) 거부권 받은 후보 제외
    pool = [c for c in cands if c.candidate_id not in vetoed]

    # 5) 모두 거부권을 받았다면 거부권을 가장 적게 받은 후보들만
    if not pool:
        least = min(s["vetoes"] for s in stats.values())
        pool = [c for c in cands if stats[c.candidate_id]["vetoes"] == least]

    # 2, 3) 좋아요 많은 순, 같으면 싫어요 적은 순 (파이썬 sort는 안정 정렬)
    def sort_key(c):
        s = stats[c.candidate_id]
        return (-s["likes"], s["dislikes"])

    pool_sorted = sorted(pool, key=sort_key)
    rest = [c for c in cands if c not in pool]
    rest_sorted = sorted(rest, key=sort_key)

    # 4) 1등 동점 처리
    top_key = sort_key(pool_sorted[0])
    tied = [c for c in pool_sorted if sort_key(c) == top_key]

    if len(tied) >= 2:
        winner = random.choice(tied)
        tie_break = "random"
        tied_candidates = [
            {"name": c.name, "appeals": list(c.appeals)} for c in tied
        ]
        # winner를 ranking 맨 앞으로
        pool_sorted = [winner] + [c for c in pool_sorted if c is not winner]
    else:
        winner = pool_sorted[0]
        tie_break = None
        tied_candidates = []

    ranking_cands = pool_sorted + rest_sorted
    ranking = [
        {
            "name": c.name,
            "likes": stats[c.candidate_id]["likes"],
            "dislikes": stats[c.candidate_id]["dislikes"],
            "vetoed": c.candidate_id in vetoed,
        }
        for c in ranking_cands
    ]

    return {
        "winner": winner.name,
        "winner_added_by": list(winner.added_by),
        "winner_appeals": list(winner.appeals),
        "tie_break": tie_break,
        "tied_candidates": tied_candidates,
        "ranking": ranking,
    }
