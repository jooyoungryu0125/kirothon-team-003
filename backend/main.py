from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from errors import ApiError
from schemas import (
    CreateRoomRequest,
    CreateRoomResponse,
    JoinRoomRequest,
    JoinRoomResponse,
    OkResponse,
    RoomStateResponse,
    StartVotingRequest,
    SubmitCandidatesRequest,
    SubmitVotesRequest,
)
from services import (
    create_room,
    get_room_state,
    join_room,
    start_voting,
    submit_candidates,
    submit_votes,
)
from store import rooms_lock

app = FastAPI(title="아무거나 말고 API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 예외 핸들러 ────────────────────────────────────────────

@app.exception_handler(ApiError)
async def api_error_handler(request: Request, exc: ApiError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """FastAPI 기본 422(RequestValidationError)를 400으로 변환한다."""
    return JSONResponse(status_code=400, content={"detail": "요청 형식이 올바르지 않아요."})


# ── 라우트 ─────────────────────────────────────────────────

@app.post("/api/rooms", response_model=CreateRoomResponse, status_code=201)
def route_create_room(body: CreateRoomRequest):
    with rooms_lock:
        result = create_room(
            host_nickname=body.host_nickname,
            topic=body.topic,
            topic_type=body.topic_type,
        )
    return result


@app.post("/api/rooms/{room_code}/join", response_model=JoinRoomResponse, status_code=201)
def route_join_room(room_code: str, body: JoinRoomRequest):
    with rooms_lock:
        result = join_room(room_code=room_code, nickname=body.nickname)
    return result


@app.post("/api/rooms/{room_code}/candidates", response_model=OkResponse)
def route_submit_candidates(room_code: str, body: SubmitCandidatesRequest):
    candidates = [{"name": c.name, "appeal": c.appeal} for c in body.candidates]
    with rooms_lock:
        result = submit_candidates(
            room_code=room_code,
            member_id=body.member_id,
            candidates=candidates,
        )
    return result


@app.post("/api/rooms/{room_code}/start", response_model=OkResponse)
def route_start_voting(room_code: str, body: StartVotingRequest):
    with rooms_lock:
        result = start_voting(room_code=room_code, member_id=body.member_id)
    return result


@app.post("/api/rooms/{room_code}/votes", response_model=OkResponse)
def route_submit_votes(room_code: str, body: SubmitVotesRequest):
    votes = [{"candidate_id": v.candidate_id, "choice": v.choice} for v in body.votes]
    with rooms_lock:
        result = submit_votes(
            room_code=room_code,
            member_id=body.member_id,
            votes=votes,
            veto_candidate_id=body.veto_candidate_id,
        )
    return result


@app.get("/api/rooms/{room_code}", response_model=RoomStateResponse)
def route_get_room(
    room_code: str,
    member_id: str | None = Query(default=None),
):
    # member_id 쿼리는 받되 검사하지 않는다
    return get_room_state(room_code=room_code)
