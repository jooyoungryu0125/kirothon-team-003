---
inclusion: fileMatch
fileMatchPattern: "frontend/**"
---

# 프론트엔드 작업 규칙 (아무거나 말고)

## 기본

- 스택은 React + TypeScript + Vite + Tailwind CSS v4이다. 작업 폴더는 `frontend/`뿐이다. `backend/`는 절대 수정하지 않는다.
- 화면 디자인은 `.kiro/steering/ui-guide.md` 규칙을 따른다. 포인트 색은 테라코타이다.
- 서비스 이름은 "아무거나 말고"이다. 화면 문구는 친근한 존댓말 "~해요" 체로 쓴다.

## 데이터와 API

- `types.ts`의 필드 이름은 `design.md`의 API JSON과 글자 하나까지 같게 쓴다. snake_case를 그대로 쓰고, camelCase로 바꾸지 않는다.
- 모든 API 호출은 `src/api.ts` 한 곳에서만 한다. 화면 컴포넌트에서 `fetch`를 직접 쓰지 않는다.
- `USE_MOCK`이 true이면 `api.ts` 안의 가짜 방이 진짜 백엔드처럼 단계(collecting → voting → done)가 바뀌며 동작한다. false이면 `import.meta.env.VITE_API_URL`로 요청한다.
- `room_code`, `member_id`, `nickname`은 `sessionStorage`에만 저장한다. `localStorage`는 쓰지 않는다.

## 화면 동작 규칙

- 방 상태는 2초마다 GET으로 폴링한다. 폴링으로 데이터가 갱신되어도 카드 투표의 현재 위치, 앞·뒷면 상태, 선택 기록, 입력 중인 값은 초기화하지 않는다.
- 화면 전환은 서버의 `status`(`collecting`, `voting`, `done`)를 기준으로 한다.
- 카드는 카드 영역을 탭할 때만 뒤집힌다. 카드 위 버튼을 누를 때는 뒤집히지 않는다.
- 오류는 alert, 팝업, 모달 없이 화면 안에 문구로 보여준다. 서버 응답의 `detail` 문장을 그대로 표시한다.
- 로딩 중에는 버튼을 비활성화해서 중복 요청을 막는다.

## 작업 방식

- 5시간 해커톤이다. 화면이 동작하는 것을 먼저 만들고, 꾸미기와 애니메이션은 나중에 한다.
- 테스트 코드는 만들지 않는다.
- 새 라이브러리는 꼭 필요할 때만 추가한다.
- Windows cmd 환경이다. 명령어를 연결할 때 `;`(세미콜론)를 쓰지 말고 `&&`를 쓰거나 하나씩 실행한다.
