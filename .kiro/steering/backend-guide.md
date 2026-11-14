---
inclusion: fileMatch
fileMatchPattern: "backend/**"
---

# 백엔드 개발 가이드 — 아무거나 말고

> **이 파일의 역할**: 백엔드 구현 시 반드시 준수해야 하는 핵심 규칙을 정리한 개발 지침이다.
> API 계약, 숫자, 알고리즘의 최종 기준은 승인된 Spec(`design.md`, `requirements.md`)이며, 이 파일과 Spec이 충돌하면 Spec을 따르고 충돌 내용을 보고한다.

---

## 1. 프로젝트 기본 정보

- **서비스명**: 아무거나 말고 / **마스코트**: 아무고릴라
- **개발 환경**: 5시간 해커톤, 2인 병렬 개발
- **프론트엔드 담당**: 주영 (`frontend/`) / **백엔드 담당**: 혜린 (`backend/`)
- **이 Steering의 작업 범위**: `backend/` 및 `.kiro/steering/backend-guide.md`

---

## 2. 기술 스택

| 항목 | 내용 |
|---|---|
| 언어 / 프레임워크 | Python 3.11 + FastAPI |
| 데이터 저장 | 백엔드 프로세스 메모리 (서버 재시작 시 모든 방 소멸, DB 없음) |
| 인증 | 없음. 방 코드 + 닉네임 + member_id(UUID)로 참여자 구분 |
| 외부 API / AI | 사용하지 않음 |
| 프론트엔드 폴링 주기 | 2초마다 `GET /api/rooms/{room_code}` 호출 |
| CORS 허용 출처 | `http://localhost:5173` |
| JSON 필드명 규칙 | snake_case (모든 요청·응답 필드) |
| 백엔드 포트 | 8000 |

---

## 3. 파일 구성

```
backend/
├── main.py        # FastAPI 앱, CORS, 라우트 6개, 예외 핸들러
├── schemas.py     # 요청/응답 Pydantic 모델
├── store.py       # 메모리 저장소 (rooms 딕셔너리, 방 코드 발급)
├── services.py    # 검증, 중복 통합, 결과 계산
└── errors.py      # ApiError(status_code, detail)
```

---

## 4. API 6개 계약

아래 6개가 전부다. 경로, HTTP Method, 필드명을 임의로 변경하지 않는다.

| Method | 경로 | 역할 |
|---|---|---|
| POST | `/api/rooms` | 방 만들기 |
| POST | `/api/rooms/{room_code}/join` | 닉네임으로 참여 |
| POST | `/api/rooms/{room_code}/candidates` | 후보 0~3개 한 번에 제출 |
| POST | `/api/rooms/{room_code}/start` | (방장) 중복 통합 + 투표 시작 |
| POST | `/api/rooms/{room_code}/votes` | 좋아/싫어 + 거부권 한 번에 제출 |
| GET  | `/api/rooms/{room_code}` | 방 상태 전체 조회 (2초 폴링) |

### 4-1. 방 만들기

요청
```json
{ "host_nickname": "주영", "topic": "오늘 점심 뭐 먹지?", "topic_type": "menu" }
```
응답
```json
{ "room_code": "A7K2", "member_id": "<uuid>" }
```
- `topic_type`은 `menu` / `movie` / `place` / `custom` 중 하나
- 서버는 이 `member_id`를 `host_id`로 저장한다

### 4-2. 참여

요청
```json
{ "nickname": "혜린" }
```
응답
```json
{ "member_id": "<uuid>" }
```

### 4-3. 후보 제출

요청
```json
{
  "member_id": "<uuid>",
  "candidates": [
    { "name": "마라탕", "appeal": "추워서 얼큰한 거" },
    { "name": "쌀국수", "appeal": "" }
  ]
}
```
응답 (성공)
```json
{ "ok": true }
```

### 4-4. 투표 시작

요청 본문에 `member_id`가 반드시 포함된다.
```json
{ "member_id": "<uuid>" }
```
응답 (성공)
```json
{ "ok": true }
```

### 4-5. 투표 제출

요청
```json
{
  "member_id": "<uuid>",
  "votes": [
    { "candidate_id": "c1", "choice": "like" },
    { "candidate_id": "c2", "choice": "dislike" }
  ],
  "veto_candidate_id": "c2"
}
```
응답 (성공)
```json
{ "ok": true }
```
- `choice`는 `like` / `dislike` 두 가지만 허용
- 거부권을 쓰지 않으면 `veto_candidate_id`는 `null`
- 거부 대상은 반드시 본인이 `dislike`한 후보여야 한다

### 4-6. 방 상태 조회

`GET /api/rooms/{room_code}?member_id=<uuid>` (쿼리 선택 사항, 없어도 오류 아님)

응답 (voting 예시)
```json
{
  "room_code": "A7K2",
  "topic": "오늘 점심 뭐 먹지?",
  "topic_type": "menu",
  "status": "voting",
  "host_id": "<uuid>",
  "members": [
    { "member_id": "<uuid>", "nickname": "주영", "submitted": true, "voted": true },
    { "member_id": "<uuid>", "nickname": "혜린", "submitted": true, "voted": false }
  ],
  "candidates": [
    { "candidate_id": "c1", "name": "마라탕", "appeals": ["추워서 얼큰한 거"] },
    { "candidate_id": "c2", "name": "쌀국수", "appeals": [] }
  ],
  "result": null
}
```

---

## 5. 방 상태 전환

방 상태는 `collecting → voting → done` 단방향으로만 전환된다. 되돌리기 없음.

| 전이 | 트리거 | 조건 | 실패 시 |
|---|---|---|---|
| (없음) → `collecting` | `POST /api/rooms` | 닉네임 1~10자, topic_type 유효, topic 1~50자, 방 코드 발급 성공 | 400 또는 503. 방이 생성되지 않는다. |
| `collecting` → `voting` | `POST /start` | member_id == host_id, 현재 collecting, **전원 submitted**, **중복 통합 후 후보 2개 이상** | 403 또는 409. 방은 collecting 유지, 후보 목록 변경 없음. |
| `voting` → `done` | `POST /votes` (자동) | 이 요청으로 모든 Member의 voted가 true가 됨 | 해당 없음. 조건 충족 즉시 같은 요청 안에서 계산 후 done. |

### 상태별 허용 요청

| 요청 | collecting | voting | done |
|---|---|---|---|
| `POST /join` | 허용 | 409 | 409 |
| `POST /candidates` | 허용 (1인 1회) | 409 | 409 |
| `POST /start` | 허용 (방장, 조건 충족 시) | 409 | 409 |
| `POST /votes` | 409 | 허용 (1인 1회) | 409 |
| `GET /api/rooms/{room_code}` | 허용 | 허용 | 허용 |

---

## 6. 방 및 사용자 관리

- `member_id`는 `uuid4` 문자열로 발급한다.
- 방 정보에 `host_id`(방 생성자의 member_id)를 저장하고, 절대 변경하지 않는다.
- 방장 전용 요청(`/start`)은 요청의 `member_id == host_id`일 때만 처리한다. `member_id`가 누락되거나 빈 문자열이어도 403.
- 방 코드는 영문 대문자와 숫자 4자리. 중복이면 재발급, 20번 실패 시 503.
- 방 코드 조회는 `room_code.strip().upper()`로 처리한다.
- 동시 요청 보호: 상태를 바꾸는 서비스 함수는 `threading.Lock` 하나로 보호한다.

---

## 7. 입력 유효성 검증

모든 검증 오류는 `{"detail": "한국어 사유"}` 형식으로 응답한다. 검사를 통과한 뒤에만 저장하고, 도중에 거절되면 데이터는 바뀌지 않는다.

### 필드 길이 제한

| 필드 | 규칙 | 오류 코드 |
|---|---|---|
| `nickname` | 1~10자. 공백만 있는 값은 빈 값으로 간주. 같은 방 안에서 중복 불가. | 400 |
| `topic` | 1~50자. 공백만 있는 값은 빈 값으로 간주. | 400 |
| `appeal` | 0~50자 | 400 |
| 후보 이름 | 50자 이하. 빈 이름이나 공백뿐인 이름은 오류 없이 그 후보만 조용히 무시. | 400 (50자 초과 시) |
| `room_code` | 4자, 영문 대문자와 숫자. 받은 값을 `strip().upper()`로 정규화 후 처리. | — |
| 후보 개수 | 요청당 0~3개. **빈 이름 후보도 개수에 포함**하여 카운트. 3개 초과 시 거절. | 400 |
| 방 인원 | 최대 6명 | 409 |

### 빈 이름 후보 처리

이름이 비어 있거나 공백뿐인 후보는 400 오류 없이 그 후보만 무시하고 나머지를 저장한다. 모든 후보가 무시되면 후보 0개 제출로 처리하여 `submitted = true` 후 `{"ok": true}` 응답한다.

### 검증 순서 (엔드포인트별)

검사 순서를 반드시 지킨다. 처음 걸린 오류만 응답한다.

| 엔드포인트 | 순서 |
|---|---|
| `POST /api/rooms` | 1) 닉네임 1~10자(400) → 2) topic_type 유효(400) → 3) topic 1~50자(400) → 4) 방 코드 발급(503) |
| `POST /join` | 1) 방 존재(404) → 2) 닉네임 1~10자(400) → 3) status가 collecting(409) → 4) 인원 6명 미만(409) → 5) 닉네임 중복 아님(409) |
| `POST /candidates` | 1) 방 존재(404) → 2) member_id가 방의 참여자(403) → 3) status가 collecting(409) → 4) 아직 제출 안 함(409) → 5) 요청 후보 개수 3개 이하(400) → 6) 이름이 비지 않은 후보의 이름 50자 이하, appeal 50자 이하(400) → 7) 빈 이름 후보 제외 후 저장 |
| `POST /start` | 1) 방 존재(404) → 2) member_id == host_id(403) → 3) status가 collecting(409) → 4) 전원 submitted(409) → 5) 통합 후 후보 2개 이상(409) → 6) 통합 확정, voting으로 변경 |
| `POST /votes` | 1) 방 존재(404) → 2) member_id가 방의 참여자(403) → 3) status가 voting(409) → 4) 아직 투표 안 함(409) → 5) 항목이 모든 후보를 정확히 한 번씩, choice가 like/dislike(400) → 6) veto_candidate_id가 null이거나 본인이 dislike한 후보(409) → 7) 저장, 전원 voted이면 결과 계산 |
| `GET` | 방 존재(404). `member_id` 쿼리는 검사하지 않는다. |

### HTTP 상태 코드 매핑

| 코드 | 의미 | 해당하는 경우 |
|---|---|---|
| 400 | 요청 값이 잘못됨 | 닉네임/topic/후보 이름/appeal 길이 초과 또는 빈 값, topic_type 오류, 후보 3개 초과, 투표 항목 누락·중복·방에 없는 후보, choice 오류, 요청 본문 형식 오류(FastAPI 기본 422를 400으로 변환) |
| 403 | 권한 없음 | `/start`의 member_id가 host_id와 다르거나 누락·빈 문자열, 요청한 member_id가 그 방의 참여자가 아님 |
| 404 | 없음 | 해당 방 코드의 방이 없음 |
| 409 | 현재 상태와 충돌 | 정원 초과, 닉네임 중복, 방 상태와 요청 불일치, 이미 후보 제출, 이미 투표 제출, 전원 미제출 상태에서 투표 시작, 통합 후 후보 2개 미만, 거부권 대상이 본인 dislike 후보가 아님 |
| 503 | 일시적으로 처리 불가 | 방 코드를 발급하지 못함 |

### 주요 오류 메시지

| 상황 | detail |
|---|---|
| 중복 통합 후 후보 2개 미만 | `중복을 합치고 나니 후보가 2개 미만이에요. 새 참여자를 기다리거나 새 방을 만들어 주세요.` |
| 전원 미제출 상태에서 투표 시작 | `아직 후보를 제출하지 않은 사람이 있어요.` |
| 방장이 아님 | `방장만 투표를 시작할 수 있어요.` |
| 방이 없음 | `방을 찾을 수 없어요.` |
| 정원 초과 | `방이 가득 찼어요. (최대 6명)` |
| 닉네임 중복 | `이미 같은 닉네임이 있어요.` |
| 방 코드 발급 실패 | `방 코드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.` |

---

## 8. 상태별 GET 응답 규칙

| 필드 | collecting | voting | done |
|---|---|---|---|
| `candidates` | 항상 빈 배열 `[]` | `candidate_id`, `name`, `appeals`만 포함. **추천인 없음.** | voting과 같은 형태 (추천인 없음) |
| `result` | `null` | `null` | 결과 객체 |
| `members[].submitted` | 후보 제출 여부 | 전원 `true` | 전원 `true` |
| `members[].voted` | 모두 `false` | 투표 제출 여부 | 전원 `true` |

**규칙 요약**
1. `collecting`일 때 `candidates`는 항상 빈 배열이다.
2. `voting`일 때 `candidates`에는 추천인(`added_by`) 정보를 절대 포함하지 않는다.
3. `result`는 `status == "done"`일 때만 객체이고, 그 외에는 `null`이다.

---

## 9. 후보 중복 통합 규칙

투표 시작(`POST /start`) 시점에 **한 번만** 수행한다.

### 정규화(normalize) 함수

```python
import re

def normalize(name: str) -> str:
    return re.sub(r"\s+", "", name).lower()
```

- 앞·뒤·중간의 모든 공백을 제거하고 영문을 소문자로 변환한다.
- 정규화된 이름이 완전히 같을 때만 통합한다. 한 글자라도 다르면 다른 후보다.
- 한 Member가 같은 정규화 이름의 후보를 두 번 제출한 경우도 하나로 통합한다.

### 통합 결과 규칙

| 항목 | 규칙 |
|---|---|
| 이름 표기 | 같은 그룹에서 **가장 먼저 제출된** 후보의 표기를 사용한다 |
| `appeals` | 그룹의 모든 비어 있지 않은 appeal을 **등록 순서대로** 하나도 빠짐없이 담는다. **빈 문자열(`""`)인 appeal은 포함하지 않는다.** |
| `added_by` | 중복 없이, 그룹에 속한 모든 추천인을 기록한다 (내부용, API 응답에 미노출) |
| `candidate_id` | `c1`, `c2`, ... 형식으로 투표 시작 시 서버가 붙인다 |

### 통합 실패 시

통합 후 후보가 2개 미만이면 통합 결과를 버리고 409를 응답한다. 방은 `collecting` 상태로 유지되고 원본 후보 목록이 그대로 보존된다.

---

## 10. 투표 처리 규칙

### 중복 투표 방지

- 후보 제출: Member당 1회. `submitted == true`인 Member의 재제출은 409.
- 투표 제출: Member당 1회. `voted == true`인 Member의 재제출은 409.

### 투표 제출 검증

- 방의 모든 Merged Candidate에 대해 `choice`가 정확히 하나씩 있어야 한다 (누락, 중복, 방에 없는 candidate_id 모두 400).
- `choice` 값은 `like` 또는 `dislike` 두 가지만 허용한다.
- `veto_candidate_id`는 `null`이거나 본인이 `dislike`한 후보여야 한다. 그렇지 않으면 409.

### 거부권 규칙

- Member당 거부권은 1개의 후보에만 행사할 수 있다.
- 거부권을 행사한 후보는 **싫어요 1표도 함께 집계한다** (거부권 행사 여부와 무관하게 `dislike` 선택이 그대로 반영됨).
- 누가 거부권을 행사했는지, 누가 어떻게 투표했는지는 어떤 응답에도 포함하지 않는다.

---

## 11. 결과 계산 규칙

모든 Member의 `voted`가 `true`가 되는 순간, **마지막 `/votes` 요청 처리 안에서** 즉시 계산하고 `status`를 `done`으로 변경한다.

### 계산 순서

1. 거부권(`veto`)을 1표 이상 받은 후보를 제외한 나머지를 1등 후보군으로 삼는다.
2. 모든 후보가 거부권을 받은 경우: 거부권을 **가장 적게** 받은 후보들만 1등 후보군으로 삼는다.
3. 1등 후보군을 **좋아요 수 내림차순**으로 정렬한다.
4. 좋아요 수가 같다면 **싫어요 수 오름차순**으로 정렬한다.
5. 1등이 여전히 동점(둘 이상)이면 동점 처리 규칙을 적용한다.

> **집계 주의**: 거부권을 행사한 후보에 대한 `dislike`도 싫어요 1표로 집계된다.

### 동점 처리

- 1등이 동점이면 `random.choice`로 균등하게(각 1/N) 1개를 최종 winner로 선정한다.
- `tie_break = "random"`, `tied_candidates`에 동점 후보 전원을 담는다.
- 동점이 없으면 `tie_break = null`, `tied_candidates = []`.

### 결과 JSON 형식

동점 없음 예시:
```json
{
  "winner": "마라탕",
  "winner_added_by": ["주영", "혜린"],
  "winner_appeals": ["추워서 얼큰한 거"],
  "tie_break": null,
  "tied_candidates": [],
  "ranking": [
    { "name": "마라탕", "likes": 4, "dislikes": 0, "vetoed": false },
    { "name": "쌀국수", "likes": 2, "dislikes": 2, "vetoed": false },
    { "name": "곱창",   "likes": 1, "dislikes": 3, "vetoed": true }
  ]
}
```

동점 있음 예시:
```json
{
  "winner": "마라탕",
  "winner_added_by": ["주영"],
  "winner_appeals": ["추워서 얼큰한 거"],
  "tie_break": "random",
  "tied_candidates": [
    { "name": "마라탕", "appeals": ["추워서 얼큰한 거"] },
    { "name": "쌀국수", "appeals": ["국물이 필요해"] }
  ],
  "ranking": [
    { "name": "마라탕", "likes": 3, "dislikes": 1, "vetoed": false },
    { "name": "쌀국수", "likes": 3, "dislikes": 1, "vetoed": false },
    { "name": "곱창",   "likes": 1, "dislikes": 3, "vetoed": true }
  ]
}
```

---

## 12. 추천인 익명성 규칙

| 상황 | 추천인(`added_by`) 공개 여부 |
|---|---|
| `collecting` 상태 GET 응답 | 비공개 (`candidates` 자체가 `[]`) |
| `voting` 상태 GET 응답 | 비공개 (candidates에 `added_by` 필드 없음) |
| `done` 상태 결과 `winner_added_by` | **최종 winner에게만** 공개 |
| `result.ranking` | 추천인 없음 |
| `result.tied_candidates` | 추천인 없음 (`name`과 `appeals`만) |

- 누가 어떻게 투표했는지, 누가 거부권을 행사했는지는 어떤 응답에도 포함하지 않는다.

---

## 13. 메모리 저장소 모델 (`store.py`)

```python
@dataclass
class Member:
    member_id: str            # uuid4 문자열
    nickname: str
    submitted: bool = False
    voted: bool = False

@dataclass
class Candidate:              # 제출된 원본 후보 (내부용)
    name: str
    appeal: str
    added_by: str             # 제출자 nickname. API 응답 미노출.
    order: int                # 방 전체에서 증가하는 등록 순서

@dataclass
class MergedCandidate:        # 투표 시작 후 확정된 후보
    candidate_id: str         # "c1", "c2", ...
    name: str
    appeals: list[str]        # 비어 있지 않은 appeal만, 등록 순서대로
    added_by: list[str]       # 내부용. result.winner_added_by에만 사용

@dataclass
class Vote:
    member_id: str
    votes: list[dict]         # {"candidate_id": str, "choice": "like" | "dislike"}
    veto_candidate_id: str | None

@dataclass
class Room:
    room_code: str
    topic: str
    topic_type: str
    status: str               # "collecting" | "voting" | "done"
    host_id: str
    members: list[Member]
    raw_candidates: list[Candidate]
    merged_candidates: list[MergedCandidate]
    votes: list[Vote]
    result: dict | None

rooms: dict[str, Room] = {}   # key: 대문자 room_code
```

- `raw_candidates`와 `added_by`는 `result.winner_added_by`를 제외하고 응답에 쓰지 않는다.

---

## 14. 코드 작성 원칙

- 모든 백엔드 코드는 `backend/` 폴더 내부에 작성한다.
- **프론트엔드 파일을 수정하지 않는다.**
- 단순하고 읽기 쉬운 코드 구조를 유지한다. 불필요한 추상화, 패키지, 복잡한 아키텍처를 도입하지 않는다.
- 5시간 해커톤에 맞춰 **MVP 완성을 최우선**으로 한다.
- 오류 처리와 유효성 검증을 반드시 구현한다.
- 기존 코드와 충돌이 발생하면 **임의로 덮어쓰지 않고 먼저 알린다**.
- FastAPI 기본 422 오류는 별도 핸들러로 400 `{"detail": "..."}` 형식으로 변환한다.

---

## 15. Spec과의 관계

- 이 Steering 파일은 개발 원칙을 정의하며, **Spec을 대체하지 않는다**.
- API 계약, 숫자, 알고리즘, 상태 전환 조건의 최종 기준은 `design.md`와 `requirements.md`이다.
- 승인된 Spec과 이 Steering이 충돌하면 **임의로 판단하지 말고 충돌 내용을 보고한다**.
- 명세에 없는 필드나 기능을 추가하지 않는다. Spec이 미승인 상태이면 구체적인 API 구조를 추측하지 않는다.
- 주영이 `requirements.md → design.md → tasks.md`를 별도로 관리하고 있다. Spec 변경 시 `design.md`를 먼저 수정하고 서로에게 알린다.
