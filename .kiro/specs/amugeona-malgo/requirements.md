# Requirements Document

## Introduction

"아무거나 말고"는 2~6명의 소규모 그룹이 작은 결정(점심 메뉴, 영화, 장소, 팀 이름 등)을 내리지 못할 때 사용하는 웹앱이다. 방장이 주제를 정해 방을 만들면 참여자가 각자 후보와 어필멘트를 제출하고, 카드 형태로 좋아/싫어 투표를 한 뒤, 거부권과 동점 규칙으로 하나의 결과를 정한다.

개발 조건은 다음과 같다.

- 프론트엔드(`frontend/`): React + TypeScript + Vite + Tailwind CSS v4
- 백엔드(`backend/`): Python 3.11 + FastAPI
- 데이터는 DB 없이 백엔드 메모리에만 저장한다.
- 프론트엔드는 2초마다 GET 폴링으로 방 상태를 조회한다.
- 로그인은 없으며, 방 코드와 닉네임으로 참여자를 구분한다.
- API 필드는 snake_case를 사용한다.
- AI 기능과 외부 API는 사용하지 않는다.

본 문서의 Requirement 1~13은 필수(Must) 요구사항이다. 필수가 아닌 요구사항(Should)은 문서 끝의 "Should (필수 아님)" 섹션에 별도로 둔다.

## Glossary

- **System**: 프론트엔드와 백엔드를 합친 "아무거나 말고" 웹앱 전체
- **Frontend**: React 기반 웹 클라이언트
- **Backend**: FastAPI 기반 서버. 모든 데이터를 메모리에 저장한다.
- **Room**: 하나의 결정을 위한 모임 단위. 4자리 Room_Code로 식별한다.
- **Room_Code**: 영문 대문자와 숫자로 이루어진 4자리 코드 (예: A7K2)
- **Room_Status**: Room의 상태. `collecting`(참여·후보 제출 중), `voting`(투표 중), `done`(결과) 중 하나이다.
- **Topic**: 방장이 정한 결정 주제 문구 (예: "오늘 점심 뭐 먹지?")
- **Topic_Type**: 주제 종류. `menu`, `movie`, `place`, `custom` 중 하나이다.
- **Host**: Room을 만든 방장
- **Host_Id**: Room 생성 시 Backend가 UUID로 만들어 저장하는 Host의 member_id
- **Member**: Room에 참여한 사람. 각 Member는 UUID 형식의 member_id를 가진다.
- **Nickname**: Member가 입력하는 이름
- **Candidate**: Member가 제출하는 결정 후보
- **Appeal**: Candidate에 붙이는 선택 입력 설명 문구(어필멘트)
- **Merged_Candidate**: 투표 시작 시 중복 통합을 거쳐 만들어진 Candidate
- **Normalized_Name**: Candidate 이름에서 모든 공백(앞뒤, 중간)을 제거하고 영문을 소문자로 바꾼 문자열
- **Submission**: Member가 후보를 제출하는 행위(한 번만 가능)
- **Vote_Submission**: Member가 모든 카드의 좋아/싫어 선택과 거부권 선택을 한 번에 제출하는 행위
- **Like / Dislike**: 한 Candidate에 대한 좋아 / 싫어 선택
- **Veto**: 거부권. Member당 1개의 Candidate에만 행사할 수 있다.
- **Vetoed_Candidate**: 한 명 이상의 Member에게 Veto를 받은 Candidate
- **Tied_Candidates**: 결과 규칙 1~3을 적용한 뒤에도 1등 자리에서 동점인 Candidate들
- **Winner**: 최종 1등 Candidate
- **Result_Screen**: 결과 공개 화면
- **Room_State_API**: `GET /api/rooms/{room_code}` 엔드포인트
- **Polling**: Frontend가 2초마다 Room_State_API를 호출하는 동작
- **Session_Storage**: 브라우저의 sessionStorage
- **Char_Counter**: 입력칸 옆에 "(현재 글자 수/최대 글자 수)" 형식으로 표시하는 글자 수 표시
- **Nickname_Placeholder**: Nickname 입력칸이 비어 있을 때 흐린 글씨로 보이는 안내 문구

## Requirements

### Requirement 1: 방 만들기와 주제 선택

**User Story:** As a 방장, I want 닉네임과 주제를 정해 방을 만들고, so that 일행이 코드로 들어와 함께 결정할 수 있다.

#### Acceptance Criteria

1. THE Frontend SHALL 홈 화면에 서비스 소개 한 줄, "방 만들기" 버튼, "코드로 참여하기" 버튼, Nickname 입력칸을 표시한다.
2. WHEN 사용자가 "방 만들기"를 선택한다, THE Frontend SHALL 🍽️ 메뉴, 🎬 영화, 📍 장소 주제 버튼과 ✏️ 직접 입력 칸을 표시한다.
3. WHEN 사용자가 주제 버튼 또는 직접 입력을 선택한다, THE Frontend SHALL 선택한 종류에 맞는 Topic_Type(`menu`, `movie`, `place`, `custom`)을 요청에 담는다.
4. WHEN 방 만들기 요청이 `POST /api/rooms`로 도착하고 Nickname이 1자 이상 10자 이하이며 Topic_Type이 `menu`, `movie`, `place`, `custom` 중 하나이다, THE Backend SHALL 영문 대문자와 숫자로 이루어진 4자리 Room_Code(예: A7K2)를 가진 Room을 `collecting` 상태로 생성한다.
5. WHEN Room이 생성된다, THE Backend SHALL UUID 형식의 member_id를 만들어 Host의 member_id와 Host_Id로 저장하고 Room_Code와 함께 응답한다.
6. IF Nickname이 비어 있거나(0자 또는 공백만 있는 경우) 10자를 초과한다, THEN THE Backend SHALL Room을 생성하지 않고 Nickname이 유효하지 않다는 사유를 담은 오류를 응답한다.
7. IF Topic_Type이 `menu`, `movie`, `place`, `custom` 중 하나가 아니거나 누락되었다, THEN THE Backend SHALL Room을 생성하지 않고 Topic_Type이 유효하지 않다는 사유를 담은 오류를 응답한다.
8. THE Backend SHALL 동시에 존재하는 Room들의 Room_Code를 서로 다르게 발급한다.
9. IF 사용 가능한 Room_Code를 발급하지 못한다, THEN THE Backend SHALL Room을 생성하지 않고 Room_Code를 발급할 수 없다는 사유를 담은 오류를 응답한다.

### Requirement 2: 코드로 참여하기

**User Story:** As a 참여자, I want 방 코드와 닉네임만으로 방에 들어가고, so that 로그인 없이 바로 참여할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 "코드로 참여하기"를 선택한다, THE Frontend SHALL Room_Code 입력칸과 Nickname 입력칸(최대 10자)을 표시한다.
2. WHEN 참여 요청이 `POST /api/rooms/{room_code}/join`으로 도착하고 Nickname이 1자 이상 10자 이하이며 해당 Room_Code의 Room이 존재하고 Room_Status가 `collecting`이며 Room의 Member가 6명 미만이고 같은 Room에 동일한 Nickname이 없다, THE Backend SHALL UUID 형식의 member_id를 만들어 Member를 Room에 추가하고, 생성된 member_id를 포함해 성공 응답한다.
3. IF 요청의 Room_Code에 해당하는 Room이 없다, THEN THE Backend SHALL 참여를 거절하고, Member를 추가하지 않으며, Room이 존재하지 않음을 나타내는 사유를 담은 오류를 응답한다.
4. IF Room의 Member가 이미 6명이다, THEN THE Backend SHALL 참여를 거절하고, Member를 추가하지 않으며, 정원(6명)이 가득 찼음을 나타내는 사유를 담은 오류를 응답한다.
5. IF Nickname이 10자를 초과하거나 비어 있다, THEN THE Backend SHALL 참여를 거절하고, Member를 추가하지 않으며, Nickname이 1자 이상 10자 이하여야 함을 나타내는 사유를 담은 오류를 응답한다.
6. IF 같은 Room에 동일한 Nickname을 가진 Member가 이미 있다, THEN THE Backend SHALL 참여를 거절하고, Member를 추가하지 않으며, Nickname이 중복되었음을 나타내는 사유를 담은 오류를 응답한다.
7. IF Room_Status가 `collecting`이 아니다, THEN THE Backend SHALL 참여를 거절하고, Member를 추가하지 않으며, 현재 Room이 참여를 받지 않는 상태임을 나타내는 사유를 담은 오류를 응답한다.
8. WHEN 방 생성 또는 참여가 성공한다, THE Frontend SHALL Room_Code, member_id, Nickname을 Session_Storage에 저장한다.
9. THE Frontend SHALL Room_Code, member_id, Nickname을 localStorage에 저장하지 않는다.
10. WHEN Frontend가 Room과 관련한 요청을 보낸다, THE Frontend SHALL Session_Storage에 저장된 member_id를 해당 요청에 포함한다.
11. IF 글자 수 제한과 관련 없는 사유로 참여 요청이 거절되어 오류 응답을 받는다, THEN THE Frontend SHALL 응답의 사유를 사용자에게 표시하고, Session_Storage에 Room_Code, member_id, Nickname을 저장하지 않으며, 입력한 Room_Code와 Nickname 값을 입력칸에 유지한다.

### Requirement 3: 대기실과 방 상태 조회

**User Story:** As a Member, I want 대기실에서 주제, 방 코드, 참여자와 제출 현황을 보고, so that 누가 준비되었는지 알 수 있다.

#### Acceptance Criteria

1. WHEN Frontend가 대기실 화면을 표시한다, THE Frontend SHALL 화면 상단에 Topic을 표시하고 Topic의 글자 크기를 참여자 목록 항목의 글자 크기보다 크게 한다.
2. WHEN Frontend가 대기실 화면을 표시한다, THE Frontend SHALL Room_Code, 참여자 목록, "6명 중 4명 제출 완료"와 같은 형식("{전체 Member 수}명 중 {submitted가 true인 Member 수}명 제출 완료")의 제출 현황을 표시한다.
3. WHILE Frontend가 Room 화면을 표시한다, THE Frontend SHALL 2초마다 Room_State_API를 호출하여 화면을 갱신한다.
4. WHEN Room_State_API 요청이 도착한다, THE Backend SHALL Room_Code, Topic, Topic_Type, Room_Status, Host_Id, Member 목록, Candidate 목록, result를 응답에 포함한다.
5. WHEN Room_State_API 요청이 도착한다, THE Backend SHALL 응답의 Member 항목마다 member_id, Nickname, `submitted`(후보 제출 완료 여부, true 또는 false), `voted`(투표 제출 완료 여부, true 또는 false)를 포함한다.
6. WHILE Room_Status가 `collecting`이다, THE Backend SHALL 응답의 candidates를 빈 배열로 응답한다.
7. WHILE Room_Status가 `voting`이다, THE Backend SHALL 응답의 candidates에 추천인 정보를 포함하지 않는다.
8. WHILE Room_Status가 `done`이 아니다, THE Backend SHALL 응답의 result를 비워서 응답한다.
9. IF 요청의 Room_Code에 해당하는 Room이 없다, THEN THE Backend SHALL 요청을 거부하고 Room이 없음을 나타내는 오류를 응답하며 어떤 Room 데이터도 변경하지 않는다.
10. IF Room_State_API 호출이 Room 없음 오류로 응답된다, THEN THE Frontend SHALL 2초 주기 호출을 중단하고 홈 화면으로 이동하는 버튼이 포함된 안내를 표시한다.
11. IF Room_State_API 호출이 네트워크 오류로 실패한다, THEN THE Frontend SHALL 마지막으로 성공한 화면 내용을 유지하고 다음 2초 주기에 다시 호출한다.
12. THE Backend SHALL 모든 API 요청·응답 필드 이름을 snake_case로 정한다.

### Requirement 4: 방장 판별

**User Story:** As a 방장, I want 방장만 쓸 수 있는 기능이 보호되고, so that 다른 참여자가 투표를 임의로 시작할 수 없다.

#### Acceptance Criteria

1. WHEN 방장 전용 요청(투표 시작)이 도착한다, THE Backend SHALL 요청의 member_id가 해당 Room의 Host_Id와 정확히 일치하는 경우에만 요청을 처리한다.
2. IF 방장 전용 요청의 member_id가 Host_Id와 다르거나 member_id가 누락되었거나 빈 문자열이다, THEN THE Backend SHALL 요청을 처리하지 않고 권한 없음 오류를 응답하며 Room의 상태(Host_Id, 투표 상태, 참여자 목록)를 변경하지 않는다.
3. WHEN Room_State_API 응답의 Host_Id가 Session_Storage에 저장된 내 member_id와 같다, THE Frontend SHALL 방장 UI(투표 시작 버튼)를 표시한다.
4. WHILE Host_Id가 내 member_id와 다르거나 Session_Storage에 member_id가 없다, THE Frontend SHALL 방장 UI(투표 시작 버튼)를 표시하지 않는다.
5. IF 방장이 탭을 닫아 Session_Storage의 member_id가 사라진다, THEN THE System SHALL 해당 Room의 Host_Id를 다른 값으로 변경하지 않고, 사라진 member_id로 방장 권한을 복구하는 요청을 거절한다.
6. IF 방장 전용 요청이 권한 없음 오류로 거절된다, THEN THE Frontend SHALL 권한이 없다는 안내 메시지를 표시하고 현재 화면의 Room 상태를 유지한다.

### Requirement 5: 후보와 어필멘트 제출

**User Story:** As a Member, I want 후보 0~3개와 어필멘트를 한 번에 제출하고, so that 다른 사람의 영향 없이 내 의견을 낼 수 있다.

#### Acceptance Criteria

1. THE Frontend SHALL 후보 입력칸 3개와 각 후보의 어필멘트 입력칸을 표시한다.
2. THE Frontend SHALL 후보 입력칸 위에 "💡 표준 표기법으로 등록해 주세요. 글자가 같으면 같은 후보로 합쳐져요. (예: 떡볶이 ⭕ / 떡복이 ❌)" 안내 문구를 표시한다.
3. WHERE Topic_Type이 `menu`, `movie`, `place`, `custom`이다, THE Frontend SHALL 후보 입력칸의 예시 문구를 각각 "예: 마라탕", "예: 인사이드 아웃", "예: 가평", "예: 후보를 입력하세요"로 표시한다.
4. WHEN 제출 요청이 `POST /api/rooms/{room_code}/candidates`로 도착하고 입력이 유효하다, THE Backend SHALL 해당 Member의 후보 0~3개와 Appeal을 한 번에 저장하고 해당 Member의 `submitted`를 참으로 바꾼다.
5. WHEN 후보 0개를 담은 제출 요청이 `POST /api/rooms/{room_code}/candidates`로 도착하고 Room_Status가 `collecting`이며 해당 Member가 아직 Submission을 완료하지 않았다, THE Backend SHALL 후보를 저장하지 않고 해당 Member의 `submitted`를 참으로 바꾸며 성공 응답을 반환한다.
6. IF 한 요청의 후보가 3개를 초과한다, THEN THE Backend SHALL 제출을 거절하고 후보 개수 초과를 알리는 오류를 응답하며, 해당 Member의 `submitted`와 기존 저장 데이터를 변경하지 않는다.
7. IF Appeal이 50자를 초과한다, THEN THE Backend SHALL 제출을 거절하고 Appeal 길이 초과를 알리는 오류를 응답하며, 해당 Member의 `submitted`와 기존 저장 데이터를 변경하지 않는다.
8. IF 이미 Submission을 완료한 Member(`submitted`가 참)가 다시 제출한다, THEN THE Backend SHALL 두 번째 제출을 거절하고 중복 제출을 알리는 오류를 응답하며, 첫 번째 Submission의 후보와 Appeal을 변경하지 않는다.
9. IF Room_Status가 `collecting`이 아니다, THEN THE Backend SHALL 후보 제출을 거절하고 현재 단계에서는 제출할 수 없음을 알리는 오류를 응답하며, 해당 Member의 `submitted`와 기존 저장 데이터를 변경하지 않는다.
10. WHEN Member의 Submission이 완료된다, THE Frontend SHALL 해당 Member의 후보 입력칸과 Appeal 입력칸을 모두 수정할 수 없는 상태(비활성)로 표시하고 제출 버튼을 다시 누를 수 없게 한다.
11. WHILE Room_Status가 `collecting`이다, THE System SHALL 요청한 Member 본인의 후보와 Appeal을 제외한 다른 Member의 후보와 Appeal을 어떤 화면과 API 응답에도 노출하지 않는다.
12. IF 제출 요청을 보낸 주체가 해당 Room의 Member가 아니다, THEN THE Backend SHALL 제출을 거절하고 Room 참여자가 아님을 알리는 오류를 응답하며, 저장된 데이터를 변경하지 않는다.

### Requirement 6: 투표 시작과 중복 후보 통합

**User Story:** As a 방장, I want 전원이 제출한 뒤 투표를 시작하고, so that 같은 후보가 하나로 합쳐져 공정하게 투표할 수 있다.

#### Acceptance Criteria

1. WHILE 참여자 전원이 Submission을 완료하지 않았다, THE Frontend SHALL 방장의 "투표 시작" 버튼을 비활성화한다.
2. WHEN 참여자 전원이 Submission을 완료한다, THE Frontend SHALL 방장의 "투표 시작" 버튼을 활성화한다.
3. WHEN 투표 시작 요청이 `POST /api/rooms/{room_code}/start`로 도착하고 Room_Status가 `collecting`이며, 참여자 전원이 Submission을 완료했고, 중복 통합 후 Candidate가 2개 이상이다, THE Backend SHALL 중복 후보 통합을 한 번 수행하고 Room_Status를 `voting`으로 바꾼다.
4. IF 전원이 Submission을 완료하지 않았다, THEN THE Backend SHALL 투표 시작을 거절하고, Room_Status를 `collecting`으로 유지하며, 제출 미완료로 거절되었음을 나타내는 오류를 응답한다.
5. IF 중복 통합 후 Candidate가 2개 미만이다, THEN THE Backend SHALL 투표 시작을 거절하고, Room_Status를 `collecting`으로 유지하며, 기존 Candidate를 통합 전 상태 그대로 보존하고, 후보 수 부족으로 거절되었음을 나타내는 오류를 응답한다.
6. WHEN 두 Candidate의 Normalized_Name이 완전히 같다, THE Backend SHALL 두 Candidate를 하나의 Merged_Candidate로 통합한다.
7. WHEN 한 Member가 같은 Normalized_Name의 후보를 두 번 제출한 경우가 있다, THE Backend SHALL 해당 후보들을 하나의 Merged_Candidate로 통합한다.
8. WHEN 두 Candidate의 Normalized_Name이 한 글자라도 다르다, THE Backend SHALL 두 Candidate를 서로 다른 후보로 유지한다.
9. WHEN 여러 Candidate가 하나의 Merged_Candidate로 통합된다, THE Backend SHALL 통합된 후보 중 제출 시각이 가장 이른 Candidate의 표기를 Merged_Candidate의 이름으로 사용한다.
10. WHEN 여러 Candidate가 하나의 Merged_Candidate로 통합된다, THE Backend SHALL 통합된 모든 Candidate의 Appeal을 등록 순서대로 하나도 누락하지 않고 Merged_Candidate에 보존한다.
11. WHEN 여러 Candidate가 하나의 Merged_Candidate로 통합된다, THE Backend SHALL 통합된 후보를 제출한 모든 Member를 중복 없이 Merged_Candidate의 추천인으로 기록한다.
12. IF Room_Status가 `collecting`이 아닌 상태에서 투표 시작 요청이 도착한다, THEN THE Backend SHALL 투표 시작을 거절하고, Room_Status와 기존 Merged_Candidate를 변경하지 않으며, 현재 상태에서는 시작할 수 없음을 나타내는 오류를 응답한다.
13. WHILE Room_Status가 `voting`이다, THE Backend SHALL 새로운 참여 요청과 후보 제출 요청을 거절하고 Room의 Member 목록과 Candidate 목록을 변경하지 않으며, 거절 사유를 나타내는 오류를 응답한다.

### Requirement 7: 카드 투표

**User Story:** As a Member, I want 후보 카드를 하나씩 보며 좋아/싫어를 고르고, so that 각 후보에 대한 내 의견을 표현할 수 있다.

#### Acceptance Criteria

1. WHILE Room_Status가 `voting`이다, THE Frontend SHALL 카드 투표 화면 상단에 Topic 전체 텍스트를 표시한다.
2. WHILE Room_Status가 `voting`이다, THE Frontend SHALL 카드 투표 화면에 아직 투표하지 않은 Candidate 카드를 한 번에 정확히 한 장씩 표시한다.
3. WHEN Candidate 카드가 새로 표시된다, THE Frontend SHALL 카드 앞면에 Candidate 이름을 표시하고 카드 뒷면에 해당 Candidate의 Appeal 목록을 표시한다.
4. WHILE Room_Status가 `voting`이다, THE Frontend SHALL 카드 투표 화면 하단에 좋아 버튼과 싫어 버튼을 항상 표시한다.
5. WHILE Room_Status가 `voting`이다, THE Frontend SHALL 카드 투표 화면에 "현재 카드 번호 / 전체 Candidate 수" 형식(예: "3 / 7")의 진행 표시를 표시한다.
6. WHEN 사용자가 카드 영역을 터치한다, THE Frontend SHALL 카드를 앞면에서 뒷면으로, 또는 뒷면에서 앞면으로 뒤집는다.
7. WHEN 사용자가 카드 위의 버튼을 누른다, THE Frontend SHALL 카드를 뒤집지 않는다.
8. WHEN 사용자가 좋아 또는 싫어를 선택한다, THE Frontend SHALL 선택을 기록하고 다음 카드를 앞면 상태로 표시한다.
9. IF Candidate에 Appeal이 없다, THEN THE Frontend SHALL 카드 뒷면에 "어필 없이 등록된 후보예요 🤐"를 표시한다.
10. WHILE Room_Status가 `voting`이다, THE Frontend SHALL 카드 뒷면에 Appeal을 작성자 정보 없이 표시한다.

### Requirement 8: 거부권 선택

**User Story:** As a Member, I want 싫어한 후보 중 하나에 거부권을 쓰고, so that 정말 싫은 후보가 선택되지 않게 할 수 있다.

#### Acceptance Criteria

1. WHEN Member가 모든 카드에 선택을 마치고 Dislike를 하나 이상 했다, THE Frontend SHALL 거부권 화면에 "거부권은 딱 1장!" 안내와 해당 Member가 Dislike한 Candidate 목록을 표시한다.
2. THE Frontend SHALL 거부권 화면에 "거부 안 할래요" 버튼과 "이걸로 거부" 버튼을 표시한다.
3. WHILE 사용자가 Dislike한 Candidate 목록에서 Candidate를 선택하지 않았다, THE Frontend SHALL "이걸로 거부" 버튼을 비활성화한다.
4. WHEN 사용자가 Dislike한 Candidate 목록에서 하나를 고르고 "이걸로 거부"를 누른다, THE Frontend SHALL 해당 Candidate 1개를 Veto 대상으로 기록하고 Vote_Submission 단계로 이동한다.
5. WHEN 사용자가 "거부 안 할래요"를 누른다, THE Frontend SHALL Veto 대상을 비우고(0개) Vote_Submission 단계로 이동한다.
6. IF Member가 Dislike를 하나도 하지 않았다, THEN THE Frontend SHALL 거부권 화면을 표시하지 않고 Veto 대상을 비운 채(0개) Vote_Submission 단계로 이동한다.
7. WHEN 사용자가 이미 선택한 Candidate와 다른 Candidate를 고른다, THE Frontend SHALL 이전 선택을 해제하고 새로 고른 Candidate 1개만 선택 상태로 유지하여 Veto 대상이 항상 최대 1개가 되게 한다.

### Requirement 9: 투표 제출과 대기

**User Story:** As a Member, I want 투표를 한 번에 제출하고 다른 사람의 진행 상황을 보며 기다리고, so that 결과가 나올 때까지 상황을 알 수 있다.

#### Acceptance Criteria

1. WHEN Member가 거부권 단계를 마치거나 건너뛴다, THE Frontend SHALL 모든 카드의 Like/Dislike 목록과 Veto 선택을 `POST /api/rooms/{room_code}/votes`로 한 번에 보낸다.
2. THE Frontend SHALL 요청의 각 선택에 choice 값으로 `like` 또는 `dislike` 중 하나만 사용한다.
3. WHERE Member가 Veto를 사용하지 않았다, THE Frontend SHALL 요청의 veto_candidate_id를 null로 보낸다.
4. WHEN 유효한 Vote_Submission이 도착한다, THE Backend SHALL 투표를 저장하고 해당 Member의 `voted`를 참으로 바꾸고 성공 응답을 반환한다.
5. IF Vote_Submission에 Room의 모든 Merged_Candidate에 대한 choice가 하나씩 들어 있지 않거나(누락, 중복, 해당 Room에 없는 Candidate 포함), THEN THE Backend SHALL 제출을 거절하고 사유를 담은 오류를 응답하며 해당 Member의 `voted`와 기존 저장 데이터를 변경하지 않는다.
6. IF veto_candidate_id가 null이 아니면서 해당 Member가 `dislike`한 Candidate가 아니다, THEN THE Backend SHALL 제출을 거절하고 사유를 담은 오류를 응답하며 해당 Member의 `voted`와 기존 저장 데이터를 변경하지 않는다.
7. IF 이미 Vote_Submission을 완료한 Member가 다시 제출한다, THEN THE Backend SHALL 두 번째 제출을 거절하고 사유를 담은 오류를 응답하며 첫 번째 제출의 저장 내용을 변경하지 않는다.
8. IF Room_Status가 `voting`이 아니다, THEN THE Backend SHALL 투표 제출을 거절하고 사유를 담은 오류를 응답하며 저장 데이터를 변경하지 않는다.
9. IF 투표 제출 요청이 거절되거나 네트워크 오류로 실패한다, THEN THE Frontend SHALL 오류 사유를 표시하고 Member가 선택한 Like/Dislike 목록과 Veto 선택을 유지한 채 재제출할 수 있게 한다.
10. WHILE Member가 Vote_Submission을 완료했고 Room_Status가 `voting`이다, THE Frontend SHALL 대기 화면에 "6명 중 3명 완료"와 같이 전체 Member 수와 `voted`가 참인 Member 수를 보여주는 진행 상황과 참여자별 완료 표시를 표시한다.
11. THE System SHALL 어떤 Member가 Veto를 사용했는지와 어떤 Member가 어떻게 투표했는지를 어떤 화면과 응답에도 노출하지 않는다.

### Requirement 10: 결과 결정

**User Story:** As a Member, I want 거부권과 좋아요/싫어요 수로 공정하게 1등이 정해지고, so that 모두가 결과를 납득할 수 있다.

#### Acceptance Criteria

1. WHEN 모든 Member의 `voted`가 참이 된다, THE Backend SHALL 결과를 계산하고 Room_Status를 `done`으로 바꾼다.
2. THE Backend SHALL 거부한 Candidate의 Dislike도 싫어 1표로 집계한다.
3. WHEN 결과를 계산한다, THE Backend SHALL Vetoed_Candidate를 제외한 나머지 Candidate를 1등 후보군으로 삼는다.
4. WHEN 1등 후보군이 둘 이상이다, THE Backend SHALL 좋아요 수가 많은 순으로 순위를 정한다.
5. WHEN 좋아요 수가 같은 Candidate가 있다, THE Backend SHALL 싫어요 수가 적은 Candidate를 더 높은 순위로 정한다.
6. IF 모든 Candidate가 Vetoed_Candidate이다, THEN THE Backend SHALL 받은 Veto 수가 가장 적은 Candidate들만 1등 후보군으로 삼고 규칙 4와 5를 적용한다.
7. IF 규칙 3~6을 적용한 뒤 1등 자리에 Candidate가 둘 이상 동점이다, THEN THE Backend SHALL 동점 처리 규칙(Requirement 11)을 적용한다.
8. WHEN 결과 계산이 완료된다, THE Backend SHALL 결과의 Winner에 대해 winner, winner_added_by(배열), winner_appeals(배열)를 응답한다.
9. WHEN 결과 계산이 완료된다, THE Backend SHALL 결과의 ranking에 Candidate별 이름, 좋아요 수, 싫어요 수, Veto 여부를 포함하고 추천인을 포함하지 않는다.

### Requirement 11: 동점 처리

**User Story:** As a Member, I want 동점일 때 후보들과 어필멘트를 본 뒤 랜덤으로 1등이 정해지고, so that 동점도 재미있고 공정하게 해결된다.

#### Acceptance Criteria

1. IF 1등 자리에 Candidate가 둘 이상 동점이다, THEN THE Backend SHALL 동점 Candidate 중 정확히 1개를 균등한 확률(각 1/N, N은 동점 Candidate 수)로 무작위 선택하여 Winner로 정하고 tie_break를 `"random"`으로 응답한다.
2. IF 1등 자리에 동점이 없다, THEN THE Backend SHALL tie_break를 null로 응답한다.
3. THE Backend SHALL 결과에 tied_candidates 필드를 포함하고, 각 항목에 name과 appeals(배열)만 담는다. 예: `{ "name": "마라탕", "appeals": ["추워서 얼큰한 거"] }`
4. IF 1등 자리에 Candidate가 둘 이상 동점이다, THEN THE Backend SHALL 1등 동점 Candidate 전원(Winner 포함)을 tied_candidates에 담아 응답하고, 각 항목의 appeals에는 해당 Candidate에 등록된 모든 Appeal을 담는다.
5. IF 1등 자리에 동점이 없다, THEN THE Backend SHALL tied_candidates를 빈 배열로 응답한다.
6. IF 동점 Candidate에 등록된 Appeal이 없다, THEN THE Backend SHALL 해당 항목의 appeals를 빈 배열로 응답한다.
7. THE Backend SHALL tied_candidates 항목에 추천인을 포함하지 않는다.
8. WHEN 동점이 있는 결과가 Result_Screen에 공개된다, THE Frontend SHALL 먼저 동점 Candidate들과 각각의 Appeal을 함께 표시한다.
9. WHEN 동점 Candidate 표시가 끝난다, THE Frontend SHALL 랜덤으로 정해진 Winner를 왕관 👑과 함께 공개한다.

### Requirement 12: 결과 공개 화면

**User Story:** As a Member, I want 1등과 그 어필멘트, 추천인, 나머지 순위를 한 화면에서 보고, so that 결과를 확인하고 이유를 알 수 있다.

#### Acceptance Criteria

1. WHEN Room_Status가 `done`으로 바뀐다, THE Frontend SHALL 해당 방의 모든 Member의 화면을 자동으로 Result_Screen으로 전환한다.
2. THE Frontend SHALL Result_Screen에 Topic을 포함한 문구("{Topic}의 결과는…")를 표시한다.
3. THE Frontend SHALL Winner 이름을 나머지 Candidate 이름보다 큰 글자 크기로, 이름 앞에 왕관 👑과 함께 표시한다.
4. THE Frontend SHALL Winner의 Appeal 목록 전체를 등록된 순서대로 표시한다.
5. THE Frontend SHALL Winner 아래에 "추천인 : 주영, 혜린" 형식으로 winner_added_by의 모든 Nickname을 쉼표와 공백(", ")으로 구분하여 표시한다.
6. THE Frontend SHALL Winner를 제외한 나머지 Candidate를 각각 좋아요 수와 싫어요 수와 함께 리스트로 표시한다.
7. WHERE Candidate가 Vetoed_Candidate이다, THE Frontend SHALL 해당 Candidate 옆에 🚫를 표시한다.
8. THE Frontend SHALL 나머지 Candidate의 추천인을 표시하지 않는다.
9. THE Backend SHALL 추천인(winner_added_by)을 최종 Winner에 대해서만 응답에 포함한다.
10. IF Result_Screen에 필요한 결과 데이터를 불러오지 못한다, THEN THE Frontend SHALL 결과 데이터를 불러오지 못했다는 오류 메시지와 재시도 버튼을 표시하고, 재시도 버튼 선택 시 결과 데이터를 다시 요청한다.

### Requirement 13: 글자 수 제한 입력

**User Story:** As a Member, I want 입력칸 옆에서 글자 수를 바로 확인하고 제한을 넘겨 입력하지 못하게 되고, so that 팝업 없이 자연스럽게 제한을 지킬 수 있다.

#### Acceptance Criteria

1. THE Frontend SHALL 글자 수 제한이 있는 입력칸(Nickname 최대 10자, Appeal 최대 50자, Room_Code 4자)마다 해당 입력칸 옆에 Char_Counter를 "(현재 글자 수/최대 글자 수)" 형식(예: "(3/10)")으로 표시한다.
2. WHEN 사용자가 입력칸의 내용을 바꾼다, THE Frontend SHALL Char_Counter의 현재 글자 수를 즉시 갱신한다.
3. WHILE 입력칸의 현재 글자 수가 최대 글자 수와 같다, THE Frontend SHALL 해당 입력칸에 더 이상 글자를 입력할 수 없게 한다.
4. WHEN 사용자가 붙여넣기 등으로 최대 글자 수를 넘는 문자열을 입력하려 한다, THE Frontend SHALL 최대 글자 수까지만 입력하고 나머지는 입력하지 않는다.
5. THE Frontend SHALL 글자 수 제한 때문에 팝업, 모달, 알림창(alert)을 띄우지 않는다.
6. THE Frontend SHALL 최대 글자 수를 초과한 값을 담은 요청을 서버로 보내지 않는다.
7. IF 최대 글자 수를 초과한 값을 담은 요청이 Backend에 직접 도착한다, THEN THE Backend SHALL 요청을 거절하고 글자 수 초과 사유를 담은 오류를 응답한다(Requirement 1.6, 2.5, 5.7).
8. WHILE Nickname 입력칸이 비어 있다, THE Frontend SHALL 입력칸 안에 불투명도를 낮춘(흐린) 글씨로 "닉네임은 한 글자 이상 입력해주세요."라는 안내 문구를 표시한다.
9. WHEN 사용자가 Nickname 입력칸에 한 글자 이상 입력한다, THE Frontend SHALL 해당 안내 문구를 즉시 숨긴다.

## Should (필수 아님)

아래 요구사항은 필수가 아니며, 시간 여유가 있을 때 구현한다. 구현하지 않아도 위 Must 요구사항의 완료에는 영향이 없다.

### Requirement 14: [Should] 두구두구 결과 공개 연출

**User Story:** As a Member, I want 결과가 공개되기 전에 두구두구 연출을 보고, so that 결과 공개의 긴장감과 재미를 느낄 수 있다.

#### Acceptance Criteria

1. WHEN Result_Screen이 표시된다, THE Frontend SHALL Winner 공개 전에 "두구두구" 연출을 표시한다.
2. WHEN "두구두구" 연출이 끝난다, THE Frontend SHALL Winner를 왕관 👑과 함께 공개한다.
3. WHERE 결과에 동점이 있다, THE Frontend SHALL 동점 Candidate 표시(Requirement 11)를 완료한 이후에 "두구두구" 연출을 표시한다.
4. WHILE "두구두구" 연출이 표시되고 있다, THE Frontend SHALL Winner의 이름과 왕관 👑을 화면에 표시하지 않는다.

### Requirement 15: [Should] 아무고릴라 마스코트 문구

**User Story:** As a Member, I want 로딩과 결과 공개에서 마스코트의 말투를 보고, so that 서비스에 친근감을 느낄 수 있다.

#### Acceptance Criteria

1. THE Frontend SHALL 마스코트 "아무고릴라"(생일 11/14, 말버릇 "고릴래?")의 문구를 로딩 화면과 결과 공개 연출에서만 사용한다.
2. WHILE Frontend가 서버 응답을 기다리는 로딩 상태이다, THE Frontend SHALL 로딩 상태가 시작된 시점부터 종료될 때까지 아무고릴라 문구를 1개 이상 표시한다.
3. WHEN Result_Screen의 결과 공개 연출이 시작된다, THE Frontend SHALL 연출이 진행되는 동안 아무고릴라 문구를 1개 이상 표시한다.
4. WHERE 아무고릴라 문구에 말버릇이 포함된다, THE Frontend SHALL 말버릇을 "고릴래?"와 동일한 문자열로 표시한다.
