# Implementation Plan: 아무거나 말고

## Overview

프론트엔드(주영)와 백엔드(혜린)가 서로의 폴더를 건드리지 않고 병렬로 개발한다. 두 사람이 공유하는 계약서는 design.md의 "API 명세" 섹션이다. 프론트엔드는 `api.ts`의 `USE_MOCK` 스위치와 가짜 방(`mock.ts`)으로 백엔드 없이 먼저 개발하고, 백엔드 API가 준비되면 스위치를 끄고 백엔드에 연결한다(`VITE_API_URL`이 없으면 `http://localhost:8000`).

## 규칙

- 각 작업은 자기 폴더(프론트엔드는 `frontend/`, 백엔드는 `backend/`)만 수정한다. 다른 폴더의 파일은 만들거나 고치지 않는다.
- 이 문서에는 테스트 작성 작업이 없다. design.md의 Correctness Properties는 참고용 문서다. 각 작업의 완료 확인은 직접 실행해서 눈으로 확인한다.
- 환경: 주영은 Windows cmd(명령 연결은 `&&`만 쓰고 `;`는 쓰지 않는다), 혜린은 macOS를 쓴다.
- `npm run dev`와 `uvicorn ... --reload`는 계속 켜져 있는 서버다. 에이전트 셸에서 실행하지 말고 사람이 직접 터미널에서 실행한다.
- Requirement 번호는 requirements.md 기준이다(Must 1~13, Should 14~15).

## 의존 관계 / 병렬 작업

- 프론트엔드는 백엔드 작업 8~13 중 API가 완성될 때까지(특히 10~13) 목 데이터(`USE_MOCK = true`)로 개발한다.
- 두 사람이 공유하는 계약서는 design.md의 "API 명세" 섹션과 "Data Models" 섹션이다. 계약을 바꿔야 하면 design.md를 먼저 고치고 서로 알린다.
- 백엔드 작업 10~13이 끝나면 주영과 혜린이 함께 수동으로 통합 확인을 한다(프론트엔드 작업 2의 마지막 단계에서 `USE_MOCK`을 끈다).
- 백엔드에는 Should 작업이 없다.

## Tasks

### 프론트엔드 (주영)

- [x] 1. 프로젝트 뼈대와 공통 코드 만들기 (`frontend/` 폴더만 수정)
  - `frontend/`에 Vite + React + TypeScript 프로젝트를 만들고 Tailwind CSS v4를 붙인다.
  - `src/index.css`에 `@import "tailwindcss";`와 `@theme` 색상 토큰(bg, surface, border, text-primary, text-secondary, text-muted, danger, success, pink-soft, pink-light, accent)과 글꼴(Pretendard)을 등록한다. 코드에서는 hex 대신 토큰 이름(`bg-accent`, `text-text-primary` 등)으로 쓴다. design.md "디자인" 섹션 참고.
  - `.kiro/steering/ui-guide.md` 12번 규칙을 따른다. 공통 컴포넌트(Button, Card, Input, Badge, ProgressBar, GorillaMascot, ErrorText, Loading)를 `src/components`에 만든다.
  - 마스코트 이미지는 `frontend/public`에 이미 있다(`gorilla.png`, `gorilla-pink.png`, `gorilla-card-bg.png`). 새로 만들거나 덮어쓰지 않는다.
  - `src/types.ts`에 design.md "Data Models"의 요청/응답 타입을 snake_case 그대로 옮긴다.
  - `src/session.ts`에 `saveSession`, `loadSession`, `clearSession`을 만든다. `sessionStorage`만 쓰고 `localStorage`는 쓰지 않는다.
  - `src/App.tsx`에 design.md "화면 전환 규칙" 표(1~8번)대로 화면을 고르는 뼈대를 만들고, `src/screens/`에 빈 화면 6개(Home, Lobby, CardVote, Veto, Waiting, Result)를 둔다.
  - `src/components/LimitedInput.tsx`(maxLength, 붙여넣기 자르기, Char_Counter, 선택 placeholder)와 `src/lib/text.ts`(글자 수 자르기 도우미)를 만든다.
  - 확인: `frontend/` 폴더에서 `npm install && npm run dev`를 사람이 직접 실행하고 `http://localhost:5173`이 열리는지, 아무고릴라 핑크(accent) 색이 적용되는지 확인한다.
  - _Requirements: 2.8, 2.9, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [x] 2. api.ts, 목 데이터, 폴링과 오류 처리 만들기 (`frontend/` 폴더만 수정)
  - `src/api.ts`에 `USE_MOCK` 스위치, `const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000"`(환경변수가 우선, 기본값은 localhost:8000), 모든 API 함수 6개(`createRoom`, `joinRoom`, `submitCandidates`, `startVoting`, `submitVotes`, `getRoom`)를 만든다. 2xx가 아니면 `detail`을 담은 `ApiError(status, detail)`을 던지고, 네트워크 오류는 `status = 0`으로 구분한다.
  - `src/mock.ts`에 가짜 방을 만든다. design.md의 JSON 예시로 데이터를 만들고, 진짜 백엔드처럼 collecting → voting → done 단계가 바뀌는 로직을 넣는다. `api.ts`는 `USE_MOCK`이 true일 때 `mock.ts`를 호출한다. 방 상태 3종(collecting, voting, done)을 모두 넣고, done에는 동점 없음 결과와 동점 있음 결과(`tie_break: "random"` + `tied_candidates`)를 둘 다 둔다. 화면에서 상태와 결과 종류를 바꿔 볼 수 있게 한다. `USE_MOCK`이 true일 때는 화면 구석에 "예시 데이터" 배지를 보여준다(ui-guide.md 8번).
  - 2초마다 `getRoom`을 호출하는 폴링 훅을 `App.tsx`에서 쓴다. 네트워크 오류면 마지막 성공 화면을 유지하고 다음 주기에 다시 호출한다. 404면 폴링을 멈추고 홈으로 가는 버튼이 있는 안내를 보여준다. `done`이 되면 결과 화면으로 간다.
  - `src/components/InlineMessage.tsx`(입력 아래 오류/안내 문구)를 만든다.
  - 마지막 단계(백엔드 API가 준비된 뒤): `USE_MOCK`을 `false`로 바꾸고 백엔드(`VITE_API_URL`, 없으면 `http://localhost:8000`)에 연결해, 혜린이 실행한 백엔드와 흐름이 맞는지 함께 확인한다. 백엔드가 아직 없으면 `true`로 두고 나머지 작업을 계속한다.
  - 확인: `USE_MOCK = true`에서 `npm run dev`를 직접 실행하고, 목 상태를 바꿔 가며 화면이 바뀌는지 본다. 개발자 도구에서 네트워크 요청이 2초마다 나가는지(목을 끈 경우) 확인한다.
  - _Requirements: 3.3, 3.10, 3.11, 3.12, 4.3, 4.4, 9.9_

- [x] 3. 홈 화면과 방 만들기/참여 구현 (`frontend/` 폴더만 수정)
  - `src/screens/Home.tsx`에 서비스 소개 한 줄, "방 만들기", "코드로 참여하기", Nickname 입력(최대 10자, Char_Counter, 비었을 때 흐린 안내 문구 "닉네임은 한 글자 이상 입력해주세요.", 한 글자 입력 시 숨김)을 만든다.
  - "방 만들기"를 누르면 🍽️ 메뉴, 🎬 영화, 📍 장소 버튼과 ✏️ 직접 입력칸(`maxLength=50`, Char_Counter 없음)을 보여준다. 버튼별 기본 문구와 `topic_type`은 design.md "입력칸 규칙" 표를 따른다.
  - "코드로 참여하기"를 누르면 Room_Code 입력칸(4자, 자동 대문자, 영문 대문자와 숫자만, Char_Counter)을 보여준다.
  - 성공하면 `saveSession`으로 Room_Code, member_id, Nickname을 저장한다. 참여가 거절되면 `detail`을 입력 아래에 인라인으로 보여주고 저장하지 않으며 입력값을 유지한다. 글자 수 제한 때문에 `alert`, 모달, 팝업을 쓰지 않는다.
  - 확인: `npm run dev`를 직접 실행하고 방 만들기와 코드 참여를 해 본다. 닉네임 11자 붙여넣기가 10자에서 잘리는지, 소문자 코드가 대문자로 바뀌는지, 새 탭에서 sessionStorage가 따로 저장되는지(개발자 도구) 확인한다.
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.8, 2.9, 2.10, 2.11, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.8, 13.9_

- [x] 4. 대기실, 후보 제출, 투표 시작 버튼 구현 (`frontend/` 폴더만 수정)
  - `src/screens/Lobby.tsx`에 Topic(참여자 목록보다 큰 글자), Room_Code, 참여자 목록, "6명 중 4명 제출 완료" 형식의 현황을 보여준다.
  - 후보 입력칸 3개(`maxLength=50`)와 Appeal 입력칸(최대 50자, Char_Counter), "💡 표준 표기법으로 등록해 주세요. 글자가 같으면 같은 후보로 합쳐져요. (예: 떡볶이 ⭕ / 떡복이 ❌)" 안내 문구, topic_type별 예시 문구(예: 마라탕, 인사이드 아웃, 가평, 후보를 입력하세요)를 만든다.
  - 제출하면 `submitCandidates`를 호출하고, 내 `submitted`가 true이면 입력칸과 제출 버튼을 비활성으로 만든다. 후보 0개로도 제출할 수 있다.
  - 방장(`host_id == 내 member_id`)에게만 "투표 시작" 버튼을 보여주고, 전원 `submitted`가 아니면 비활성으로 둔다. 오류(403, 409)는 버튼 바로 아래에 `detail`을 인라인으로 보여주고, 방 상태가 바뀌거나 버튼을 다시 누르면 지운다.
  - 확인: `USE_MOCK = true`에서 `npm run dev`를 직접 실행하고, 방장/비방장 화면, 제출 후 비활성, 투표 시작 오류 문구(목에서 409 흉내)를 확인한다.
  - _Requirements: 3.1, 3.2, 4.3, 4.4, 4.6, 5.1, 5.2, 5.3, 5.10, 6.1, 6.2, 13.1, 13.2, 13.3, 13.4_

- [x] 5. 카드 투표, 거부권, 투표 제출, 기다리는 중 화면 구현 (`frontend/` 폴더만 수정)
  - `src/components/FlipCard.tsx`와 `src/screens/CardVote.tsx`: 상단 Topic 전체, 카드 한 장씩, 앞면에 이름, 뒷면에 Appeal 목록(없으면 "어필 없이 등록된 후보예요 🤐", 작성자 정보 없음), 하단 좋아/싫어 버튼과 "3 / 7" 진행 표시를 만든다. 카드 영역을 탭하면 뒤집히고, 버튼 클릭은 `stopPropagation()`으로 뒤집지 않는다. 선택하면 다음 카드를 앞면으로 보여준다.
  - `src/screens/Veto.tsx`: "거부권은 딱 1장!", 내가 dislike한 후보 목록, "거부 안 할래요", "이걸로 거부"(선택 전 비활성)를 만든다. 다른 후보를 고르면 이전 선택을 해제한다. dislike가 하나도 없으면 이 화면을 건너뛴다.
  - 마지막 카드와 거부권 단계가 끝나면 `submitVotes`로 모든 선택과 `veto_candidate_id`(안 쓰면 null)를 한 번에 보낸다. 실패하면 사유를 보여주고 선택 내용을 유지한 채 재제출할 수 있게 한다. 로컬 단계(`cards`, `veto`, `submitting`)는 design.md "화면 전환 규칙"을 따른다.
  - `src/screens/Waiting.tsx`: "6명 중 3명 완료"와 참여자별 완료 표시를 보여준다.
  - 확인: `USE_MOCK = true`에서 `npm run dev`를 직접 실행하고 voting 목 데이터로 카드 넘기기, 뒤집기, 거부권 선택/건너뛰기, 제출 후 기다리는 중 화면을 확인한다.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.1, 9.2, 9.3, 9.9, 9.10_

- [x] 6. 결과 공개 화면 구현 (`frontend/` 폴더만 수정)
  - `src/screens/Result.tsx`에 "{Topic}의 결과는…" 문구, 👑과 함께 큰 글자의 winner 이름, `winner_appeals` 전체(등록 순서), "추천인 : 주영, 혜린"(", " 구분), 나머지 후보 목록(좋아요/싫어요 수, 거부권 받은 후보 옆 🚫, 추천인 없음)을 만든다.
  - 동점 흐름(`tied_candidates`가 비어 있지 않을 때): 먼저 동점 후보들과 각각의 Appeal을 함께 보여주고, 그 표시가 끝나면 winner를 👑과 함께 공개한 뒤 일반 결과 내용을 이어서 보여준다. 동점이 없으면 한 화면에 모두 보여준다.
  - 결과 데이터를 못 불러오면 오류 문구와 "다시 시도" 버튼을 보여주고, 버튼을 누르면 다시 요청한다. `status`가 `done`으로 바뀌면 모든 Member의 화면이 자동으로 결과 화면이 된다.
  - 확인: `USE_MOCK = true`에서 `npm run dev`를 직접 실행하고, 동점 없음 결과와 동점 있음 결과(목 데이터) 둘 다 화면에서 확인한다. 오류 상태와 재시도 버튼도 확인한다.
  - _Requirements: 11.8, 11.9, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.10_

- [x] 7. [Should] 두구두구 결과 공개 연출과 아무고릴라 문구 (`frontend/` 폴더만 수정)
  - 필수 작업이 아니다. 시간 여유가 있을 때만 하고, 하지 않아도 작업 1~6의 완료에는 영향이 없다.
  - `src/screens/Result.tsx`에서 Winner 공개 전에 "두구두구" 연출을 보여준다. 동점이면 동점 후보 표시가 끝난 뒤에 연출하고, 연출 중에는 winner 이름과 👑을 숨긴다. 연출이 끝나면 winner를 👑과 함께 공개한다.
  - 마스코트 "아무고릴라"(생일 11/14, 말버릇 "고릴래?")의 문구를 로딩 화면과 결과 공개 연출에서만 쓴다. 로딩이 시작될 때부터 끝날 때까지 문구를 1개 이상 보여주고, 말버릇은 "고릴래?"를 그대로 쓴다.
  - 확인: `USE_MOCK = true`에서 `npm run dev`를 직접 실행하고, 동점 있음/없음 결과 모두에서 두구두구 → 공개 순서와 로딩 문구를 확인한다.
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 15.1, 15.2, 15.3, 15.4_

### 백엔드 (혜린)

- [x] 8. 백엔드 뼈대 만들기 (`backend/` 폴더만 수정)
  - `backend/`에 design.md "파일 구성"대로 `main.py`, `schemas.py`, `store.py`, `services.py`, `errors.py`를 만든다.
  - FastAPI 앱을 만들고 CORS로 `http://localhost:5173`을 허용한다. `errors.py`에 `ApiError(status_code, detail)`을 만들고, 모든 오류를 `{"detail": "..."}`로 응답하는 핸들러를 둔다. FastAPI 기본 422는 400 `{"detail": "..."}`로 바꾸는 핸들러를 둔다.
  - `backend/requirements.txt`에 `fastapi`와 `uvicorn`을 적는다.
  - 확인: macOS에서 `backend/` 폴더에서 `python3 -m venv .venv && source .venv/bin/activate && pip install fastapi uvicorn`을 실행한 뒤, 사람이 직접 `uvicorn main:app --reload --port 8000`을 실행한다. 브라우저에서 `http://localhost:8000/docs`가 열리는지 확인한다. (Windows는 `python -m venv .venv && .venv\Scripts\activate && pip install fastapi uvicorn`)
  - _Requirements: 3.12, 13.7_

- [x] 9. 메모리 모델, 방 서비스, 방 코드 발급 만들기 (`backend/` 폴더만 수정)
  - `store.py`에 design.md "메모리 모델"의 `Member`, `Candidate`, `MergedCandidate`, `Vote`, `Room` 데이터클래스와 `rooms` 딕셔너리를 만든다.
  - 모든 방 데이터를 읽고 쓰는 곳에 `threading.Lock`을 써서 동시 요청에도 데이터가 깨지지 않게 한다.
  - 방 코드는 영문 대문자와 숫자 4자를 무작위로 뽑고, 겹치면 다시 뽑는다. 20번 시도해도 실패하면 503을 응답한다. 방 코드 조회는 `room_code.strip().upper()`로 한다.
  - member_id는 `uuid4` 문자열로 만든다.
  - 확인: 파이썬 셸에서 방 코드 발급 함수를 여러 번 호출해 4자, 대문자와 숫자, 중복 없음을 눈으로 확인한다.
  - _Requirements: 1.5, 1.8, 1.9_

- [x] 10. 방 만들기, 참여, 방 상태 조회 API 만들기 (`backend/` 폴더만 수정)
  - `POST /api/rooms`: design.md 검증 순서(닉네임 1~10자 → topic_type → topic 1~50자 → 방 코드 발급)를 지키고, 방을 `collecting`으로 만들어 `{ "room_code", "member_id" }`를 응답한다. `host_id`는 만든 사람의 member_id다.
  - `POST /api/rooms/{room_code}/join`: 순서(방 존재 404 → 닉네임 400 → collecting 409 → 6명 미만 409 → 닉네임 중복 409)를 지키고 design.md "주요 detail 문구"의 문구를 그대로 쓴다. 성공하면 `{ "member_id" }`를 응답한다.
  - `GET /api/rooms/{room_code}`: 선택 쿼리 `member_id`를 받되 검사하지 않는다. 상태별 응답 규칙을 따른다. collecting이면 `candidates`는 `[]`, voting이면 추천인 없이 `candidate_id`, `name`, `appeals`만, done이 아니면 `result`는 `null`이다. `members[]`에 `member_id`, `nickname`, `submitted`, `voted`를 담고 모든 필드는 snake_case다. 방이 없으면 404 `방을 찾을 수 없어요.`다.
  - 확인: `uvicorn main:app --reload --port 8000`을 사람이 직접 실행하고 `http://localhost:8000/docs`에서 방 만들기 → 참여 → 상태 조회를 눌러 본다. 정원 6명 초과, 닉네임 중복, 없는 방 코드의 오류 응답도 확인한다.
  - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.12_

- [x] 11. 후보 제출 API 만들기 (`backend/` 폴더만 수정)
  - `POST /api/rooms/{room_code}/candidates`: design.md 검증 순서(방 존재 404 → 참여자 403 → collecting 409 → 아직 제출 안 함 409 → 요청 후보 3개 이하 400 → 이름이 비지 않은 후보의 이름과 Appeal 50자 이하 400 → 저장)를 지킨다.
  - 후보 개수는 요청에 담겨 온 그대로 센다(빈 이름 후보도 개수에 포함). 이름이 비었거나 공백뿐인 후보는 오류 없이 그 후보만 무시한다. 모두 무시되거나 0개를 보내면 후보를 저장하지 않고 `submitted = true`로 바꾼 뒤 `{ "ok": true }`를 응답한다.
  - 한 번 제출한 Member의 두 번째 제출은 409로 거절하고 기존 데이터를 바꾸지 않는다. 오류가 나면 `submitted`와 저장 데이터는 바뀌지 않는다. 제출 순서(등록 순서)를 `order`로 기록한다.
  - 확인: `http://localhost:8000/docs`에서 후보 2개, 0개, 4개, 51자 이름, 51자 Appeal, 빈 이름 포함 요청, 두 번째 제출을 눌러 응답 코드와 `GET`의 `submitted` 값을 확인한다.
  - _Requirements: 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.11, 5.12, 13.7_

- [x] 12. 투표 시작 API와 중복 후보 통합 만들기 (`backend/` 폴더만 수정)
  - `POST /api/rooms/{room_code}/start`: 요청 본문 `{ "member_id" }`를 받고 순서(방 존재 404 → member_id == host_id 403 → collecting 409 → 전원 제출 409 → 통합 후 후보 2개 이상 409 → 통합 확정, voting으로 변경)를 지킨다.
  - `services.py`에 design.md "중복 통합 알고리즘"의 `normalize`(모든 공백 제거 + 소문자)와 `merge_candidates`를 구현한다. 이름은 가장 먼저 제출된 표기, `appeals`는 비어 있지 않은 Appeal을 등록 순서대로 전부, 추천인은 중복 없이 기록하고, `candidate_id`는 `c1`, `c2`, ...로 붙인다.
  - 통합 후 후보가 2개 미만이면 통합 결과를 버리고 409를 응답한다(방은 collecting, 원본 후보 목록 그대로). detail 문구는 design.md "주요 detail 문구" 표의 그대로다. 예: 후보 2개 미만이면 `중복을 합치고 나니 후보가 2개 미만이에요. 새 참여자를 기다리거나 새 방을 만들어 주세요.`, 전원 제출 전이면 `아직 후보를 제출하지 않은 사람이 있어요.`, 방장이 아니면 `방장만 투표를 시작할 수 있어요.`
  - 투표 중(voting)에는 새 참여와 후보 제출이 409로 거절되는지도 확인한다.
  - 확인: `http://localhost:8000/docs`에서 방장이 아닌 member_id, 미제출 상태, "마라탕"/"마 라 탕"/"MARA탕" 같은 중복 후보, 후보 1개뿐인 방으로 `start`를 눌러 응답과 `GET` 결과(candidates에 추천인이 없는지)를 확인한다.
  - _Requirements: 4.1, 4.2, 4.5, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13_

- [x] 13. 투표 제출 API와 결과 계산 만들기 (`backend/` 폴더만 수정)
  - `POST /api/rooms/{room_code}/votes`: 순서(방 존재 404 → 참여자 403 → voting 409 → 아직 투표 안 함 409 → 모든 후보가 정확히 한 번씩, choice는 like/dislike 400 → `veto_candidate_id`가 null이거나 본인이 dislike한 후보 409 → 저장)를 지키고, 성공하면 `voted = true`와 `{ "ok": true }`를 응답한다.
  - 마지막 Member의 투표로 전원 `voted`가 되면 같은 요청 안에서 design.md "결과 계산 의사코드"대로 결과를 계산하고 status를 `done`으로 바꾼다. 거부한 후보의 dislike도 싫어 1표로 센다. 거부권을 받은 후보는 제외하고, 모두 받았으면 거부권이 가장 적은 후보들만 1등 후보군으로 삼는다. 좋아요 많은 순, 같으면 싫어요 적은 순으로 정렬한다.
  - 1등이 동점이면 `random.choice`로 균등하게 winner를 정하고 `tie_break = "random"`, `tied_candidates`에 동점 후보 전원(`name`, `appeals`만)을 담는다. 동점이 없으면 `tie_break = null`, `tied_candidates = []`다. `ranking[0]`은 winner다.
  - `winner_added_by`는 최종 winner에 대해서만 내려보내고, `ranking`과 `tied_candidates`에는 추천인을 넣지 않는다. 누가 어떻게 투표했는지, 누가 거부권을 썼는지는 어떤 응답에도 넣지 않는다. `GET`은 done일 때만 `result` 객체를 돌려준다.
  - 확인: `http://localhost:8000/docs`에서 2~3명이 투표를 제출하며 누락된 후보, 거부권 대상이 본인이 dislike한 후보가 아닌 경우, 두 번째 제출의 응답 코드를 확인한다. 전원 제출 뒤 `GET` 결과에 동점 있음(`tied_candidates`)과 동점 없음 두 경우, 모든 후보가 거부된 경우가 의도대로 나오는지 본다. 이후 프론트엔드 `USE_MOCK = false`로 주영과 함께 한 번 끝까지 진행해 본다.
  - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.8, 9.11, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 12.9_

## Notes

- 프론트엔드 Should 작업은 7번 하나이고, 마지막 작업으로 따로 두었다. 백엔드에는 Should 작업이 없다.
- 계속 켜져 있는 서버(`npm run dev`, `uvicorn`)는 에이전트가 아니라 사람이 직접 실행한다.
- 이 계획에는 테스트 작성 작업이 없다. 각 작업의 완료 기준은 직접 실행해서 확인하는 것이다.
- 프론트엔드 6개, 백엔드 6개의 필수 작업을 모두 끝내면 Must(Requirement 1~13)가 완료된다.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "8"] },
    { "id": 1, "tasks": ["2", "9"] },
    { "id": 2, "tasks": ["3", "10"] },
    { "id": 3, "tasks": ["4", "11"] },
    { "id": 4, "tasks": ["5", "12"] },
    { "id": 5, "tasks": ["6", "13"] },
    { "id": 6, "tasks": ["7"] }
  ]
}
```
