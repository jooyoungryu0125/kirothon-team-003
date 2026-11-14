---
inclusion: fileMatch
fileMatchPattern: "frontend/**"
---

# 프론트엔드 작업 규칙 (아무거나 말고)

## 기본

- 담당은 주영(프론트엔드)이다. 스택은 React + TypeScript + Vite + Tailwind CSS v4이다. 작업 폴더는 `frontend/`뿐이다. `backend/`는 절대 수정하지 않는다.
- 기준 문서는 `.kiro/specs/amugeona-malgo/`의 requirements.md, design.md, tasks.md이다. 기획서 규칙, 숫자, API JSON 필드 이름은 바꾸지 않는다.
- 화면 디자인은 `.kiro/steering/ui-guide.md`가 있으면 그 규칙을 따른다. 없으면 design.md의 팔레트를 따른다. 포인트 색은 테라코타이다.
- 서비스 이름은 "아무거나 말고"이다. 화면 문구는 친근한 존댓말 "~해요" 체로 쓴다.
- AI 기능, 외부 API, 로그인, 채팅, 알림, DB는 쓰지 않는다. 기획서에 없는 기능은 만들지 않는다.

## 데이터와 API

- `types.ts`의 필드 이름은 `design.md`의 API JSON과 글자 하나까지 같게 쓴다. snake_case를 그대로 쓰고, camelCase로 바꾸지 않는다.
- 결과 JSON에는 `tied_candidates`가 있다. 동점이 없으면 빈 배열이고, `tie_break`는 `null`(동점 없음) 또는 `"random"`이다. `winner`, `winner_added_by`, `winner_appeals`, `ranking`은 기획서 그대로 쓴다.
- 모든 API 호출은 `src/api.ts` 한 곳에서만 한다. 화면 컴포넌트에서 `fetch`를 직접 쓰지 않는다.
- `USE_MOCK`이 true이면 `api.ts` 안의 가짜 방이 진짜 백엔드처럼 단계(collecting → voting → done)가 바뀌며 동작한다. false이면 `import.meta.env.VITE_API_URL`로 요청한다.
- 가짜 방 데이터는 기획서의 JSON 예시로 만든다. 동점이 있는 결과 예시(`tie_break: "random"` + `tied_candidates`)도 하나 넣는다.
- `room_code`, `member_id`, `nickname`은 `sessionStorage`에만 저장한다. 탭마다 따로 저장되어야 탭 여러 개로 시연할 수 있다. `localStorage`는 쓰지 않는다.
- 모든 요청에 `member_id`를 함께 보낸다. 방 상태의 `host_id`와 내 `member_id`가 같을 때만 방장 UI(투표 시작 버튼)를 보여준다.

## 화면 동작 규칙

- 방 상태는 2초마다 GET으로 폴링한다. 폴링으로 데이터가 갱신되어도 카드 투표의 현재 위치, 앞·뒷면 상태, 선택 기록, 입력 중인 값은 초기화하지 않는다.
- 화면 전환은 서버의 `status`(`collecting`, `voting`, `done`)를 기준으로 한다.
- `collecting`일 때 `candidates`는 빈 배열이고, `voting`일 때 `candidates`에는 추천인이 없다. 이 전제로 화면을 만든다.
- 카드는 카드 영역을 탭할 때만 뒤집힌다. 카드 위 버튼을 누를 때는 뒤집히지 않는다.
- 결과 화면에서 동점(`tied_candidates`가 비어 있지 않음)이면 동점 후보들과 각각의 어필멘트를 먼저 보여준 뒤, 랜덤으로 정해진 1등을 왕관 👑과 함께 공개한다.
- 추천인은 최종 1등에게만 보여준다. 나머지 후보와 `tied_candidates`에는 추천인을 보여주지 않는다. 누가 거부했는지, 누가 어떻게 투표했는지도 보여주지 않는다.
- 글자 수 제한이 있는 입력칸(닉네임 10자, 어필멘트 50자, 방 코드 4자)은 입력칸 옆에 `(현재 글자 수/최대 글자 수)`를 보여주고, 최대에 닿으면 더 입력되지 않게 한다. 글자 수 때문에 팝업을 띄우지 않는다.
- 오류는 alert, 팝업, 모달 없이 화면 안에 문구로 보여준다. 서버 응답의 `detail` 문장을 그대로 표시한다.
- 로딩 중에는 버튼을 비활성화해서 중복 요청을 막는다.

## Should (필수 아님)

- 두구두구 결과 공개 연출과 마스코트 "아무고릴라"(생일 11/14, 말버릇 "고릴래?") 문구는 Should이다. 로딩과 결과 공개 연출 문구에 쓴다.
- Must 작업을 모두 끝낸 뒤에 한다. tasks.md에서도 마지막 작업으로 따로 둔다.

## 작업 방식

- 5시간 해커톤이다. 화면이 동작하는 것을 먼저 만들고, 꾸미기와 애니메이션은 나중에 한다.
- 테스트 코드는 만들지 않는다.
- 새 라이브러리는 꼭 필요할 때만 추가한다.
- Windows cmd 환경이다. 명령어를 연결할 때 `;`(세미콜론)를 쓰지 말고 `&&`를 쓰거나 하나씩 실행한다.
