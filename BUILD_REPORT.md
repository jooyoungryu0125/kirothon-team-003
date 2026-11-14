# BUILD_REPORT.md — 아무거나 말고

> **작성 범위**: 프론트엔드(주영) + 백엔드(혜린) 전체 개발 과정의 Kiro 활용 내역  
> **작성 기준**: Spec 문서, Git 커밋 기록, 실제 생성된 산출물  
> **작성일**: 2026-11-14 (해커톤 당일)

---

## 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 서비스명 | 아무거나 말고 |
| 개발 형태 | 5시간 해커톤, 2인 병렬 개발 |
| 프론트엔드 담당 | 주영 (`frontend/` 브랜치 → main 병합) |
| 백엔드 담당 | 혜린 (`backend/` 브랜치 → main 병합) |
| 최종 병합 | PR #1 (backend), PR #2 (frontend) → main |

---

## 전체 개발 타임라인

| 시각 | 커밋 | 작업자 | 내용 |
|---|---|---|---|
| ~14:37 | `Add backend steering` | 혜린 | 백엔드 Steering 초안 생성 |
| ~15:24 | `아무거나 말고 스펙 문서 추가` | 주영 | Spec 3종 커밋 (requirements, design, tasks) |
| ~15:43 | `프론트엔드 스티어링 파일 추가` | 주영 | 프론트엔드 Steering 초안 생성 |
| ~15:44 | `Update backend steering to match specs` | 혜린 | Spec 대조 후 백엔드 Steering 전면 개정 |
| ~15:56 | `프론트엔드 스티어링 규칙 보강` | 주영 | 프론트엔드 Steering 보강 |
| ~16:20 | `Complete backend API implementation` | 혜린 | 백엔드 API 6개 완성 |
| ~16:49 | `UI 가이드 스티어링 추가` | 주영 | UI 가이드 Steering 추가 |
| ~16:55 | `프론트 뼈대 + API 연결부` | 주영 | 프론트엔드 뼈대 전체 커밋 |
| ~17:16 | `화면 구현 완료(투표, 거부권, 결과, 두구두구 5초), 백엔드 연결` | 주영 | 화면 완성 + USE_MOCK=false |
| — | PR #1, PR #2 → main | 공동 | 최종 병합 완료 |

---

## Kiro 활용 내역

### 공통: Spec 작성

| 개발 단계 | Kiro 기능 | 실제 활용 방법 | 산출물 | 검증 결과 |
|---|---|---|---|---|
| 요구사항 정의 | Kiro Spec (Vibe 세션) | 서비스 기획을 바탕으로 requirements.md, design.md, tasks.md 3종 작성 | `.kiro/specs/amugeona-malgo/` (커밋 `e6b30e4`, +1,381줄) | Spec 단계별 검토 후 확정 |

---

### 백엔드 (혜린)

| 개발 단계 | Kiro 기능 | 실제 활용 방법 | 산출물 | 검증 결과 |
|---|---|---|---|---|
| Backend Steering 초안 | Kiro Chat (Vibe) | 백엔드 개발 규칙을 프롬프트로 입력 → Steering 초안 생성 요청 | `backend-guide.md` 초안 (커밋 `7546822`, +116줄) | 초안 검토 완료 |
| Spec ↔ Steering 비교 분석 | Kiro Chat | Spec 확정 후 불일치 항목 비교 분석 요청 | 불일치 5건 보고 수령 | 5건 모두 개정에 반영 |
| Backend Steering 개정 | Kiro Chat + fileMatch Steering | Spec 1:1 대응으로 전면 재작성. `backend/**` 편집 시 자동 참조 설정 | `backend-guide.md` 개정본 (커밋 `ff13d54`, +403줄) | Spec과 불일치 없음 확인 |
| 백엔드 API 6개 구현 | Kiro Chat + Steering 자동 참조 | tasks.md Task 8~13 순서대로 구현 요청. Steering이 자동 참조되어 Spec 규칙 반영 | `backend/` 파일 5개 (커밋 `95222e1`, +712줄) | 15개 시나리오 직접 검증 ✅ |
| 엣지 케이스 검증 | Kiro Chat (스크립트 생성·실행) | Spec 엣지 케이스를 시나리오로 구성해 curl + Python assert로 자동 검증 | 검증 스크립트 (세션 내 실행) | 15개 전부 통과 |

**발견된 불일치 항목 (Kiro 분석 결과)**

| 항목 | 내용 |
|---|---|
| ① 빈 appeal 처리 | "모든 어필멘트 보존"이 빈 문자열 포함으로 오독될 수 있음 → Spec 기준으로 수정 |
| ② 거부권 싫어요 집계 | 거부 대상 후보에도 dislike 1표 집계한다는 규칙 누락 |
| ③ 투표 시작 조건 | "통합 후 후보 2개 이상" 조건이 Steering에 미기재 |
| ④ `/start` 요청 본문 | `member_id` 필드 필요함이 미기재 |
| ⑤ topic 길이 제한 | 1~50자 제한이 Steering에 누락 |

**검증한 시나리오 (15개)**

| 시나리오 | 결과 |
|---|---|
| 방 만들기 → 참여 → 조회 (정상 흐름) | ✅ |
| collecting 상태에서 `candidates: []` 반환 | ✅ |
| 중복 후보 통합 (`마 라 탕` → `마라탕`, appeals 2개 보존) | ✅ |
| voting 상태에서 추천인(`added_by`) 미노출 | ✅ |
| 투표 제출 → 자동 결과 계산 → done 전환 | ✅ |
| 1등 동점 → `tie_break: "random"`, `tied_candidates` 정상 반환 | ✅ |
| 전원 거부권 → 최소 거부 후보군 fallback | ✅ |
| `ranking[0].name == winner` | ✅ |
| `winner_added_by`가 winner에게만 공개 | ✅ |
| `tied_candidates`에 추천인 없음 | ✅ |
| 422 → 400 변환 | ✅ |
| 중복 제출·투표 방지 (409) | ✅ |
| 잘못된 상태 전환 전 조합 (409) | ✅ |
| 오류 응답 형식 `{"detail": "..."}` 통일 | ✅ |
| Spec 외 임의 엔드포인트 없음 확인 | ✅ |

---

### 프론트엔드 (주영)

> 프론트엔드 작업은 주영의 로컬 환경(Windows)에서 진행됐어요.  
> 아래 내역은 Git 커밋 기록과 산출물 파일로 확인한 내용이에요.  
> Kiro와의 구체적인 대화 내용은 별도 세션에서 진행됐으므로 확인된 사실만 기재했어요.

| 개발 단계 | Kiro 기능 | 실제 활용 방법 | 산출물 | 검증 결과 |
|---|---|---|---|---|
| Frontend Steering 작성 | Kiro Chat + fileMatch Steering | 프론트엔드 개발 규칙 Steering 초안 생성 → 2회 보강 | `frontend.md` (커밋 `cc90b50`, `539522a`) | — |
| UI 가이드 Steering 추가 | Kiro Chat + fileMatch Steering | 색상 팔레트·컴포넌트·이미지 규칙 등 UI 가이드 Steering 추가 | `ui-guide.md` (커밋 `6031784`) | — |
| 아무고릴라 이미지 준비 | — | 마스코트 이미지 3종 추가 | `gorilla.png`, `gorilla-pink.png`, `gorilla-card-bg.png` (커밋 `916be13`, `b1a9f21`) | — |
| 프론트엔드 뼈대 구현 | Kiro Chat + Steering 자동 참조 | Vite + React + TypeScript 프로젝트 뼈대, 공통 컴포넌트, api.ts, mock.ts, 화면 뼈대 6개 | `frontend/` 전체 초기 구조 (커밋 `2b4edfb`, +4,158줄) | 목 데이터로 화면 전환 확인 |
| 화면 전체 구현 완료 | Kiro Chat + Steering 자동 참조 | 카드 투표·거부권·결과·두구두구 연출·대기 화면 완성. USE_MOCK=false로 백엔드 연결 | 커밋 `7fd5a0e` (+810줄) | 백엔드 연결 후 실제 흐름 확인 |

**구현된 화면 및 주요 컴포넌트**

| 파일 | 역할 |
|---|---|
| `screens/Home.tsx` | 방 만들기 / 코드 참여, 닉네임·주제 입력 |
| `screens/Lobby.tsx` | 대기실, 후보 제출, 방장 투표 시작 버튼 |
| `screens/CardVote.tsx` | 카드 1장씩 버튼 선택, 카드 탭 뒤집기 |
| `screens/Veto.tsx` | 거부권 선택 화면 |
| `screens/Waiting.tsx` | 투표 완료 후 대기 |
| `screens/Result.tsx` | 두구두구 연출(5초) + 동점 처리 + 결과 공개 |
| `useVoteProgress.ts` | 카드 투표 진행 상태 훅 (폴링 갱신에도 초기화되지 않음) |
| `useRoomPolling.ts` | 2초 주기 GET 폴링 훅 |
| `api.ts` | API 함수 6개, `USE_MOCK` 스위치, `VITE_API_URL` 환경변수 |

---

### Should 항목 구현 현황

| 항목 | Spec 분류 | 구현 여부 |
|---|---|---|
| 두구두구 결과 공개 연출 (5초) | Should | ✅ 구현됨 |
| 아무고릴라 마스코트 문구 | Should | ✅ 구현됨 |
| 스와이프 투표 | 계획 외 | ❌ 미구현 (향후 과제로 정리) |

---

## 최종 구현 결과

### 백엔드 산출물

| 파일 | 역할 | 커밋 |
|---|---|---|
| `backend/main.py` | FastAPI 앱, CORS, 라우트 6개, 예외 핸들러 | `6438218`, `95222e1` |
| `backend/errors.py` | `ApiError(status_code, detail)` 통일 오류 클래스 | `95222e1` |
| `backend/schemas.py` | 요청·응답 Pydantic 모델 전체 | `95222e1` |
| `backend/store.py` | 메모리 저장소, 데이터클래스 5개, `threading.Lock` | `95222e1` |
| `backend/services.py` | 검증 로직, `normalize()`, `merge_candidates()`, `compute_result()` | `95222e1` |

### 프론트엔드 산출물

| 항목 | 내용 |
|---|---|
| 화면 수 | 6개 (Home, Lobby, CardVote, Veto, Waiting, Result) |
| 공통 컴포넌트 | 12개 (Button, Card, FlipCard, LimitedInput, GorillaMascot 등) |
| 커스텀 훅 | 2개 (useRoomPolling, useVoteProgress) |
| 총 코드 | 약 2,995줄 |
| 최종 USE_MOCK | `false` (백엔드 연결 상태로 커밋) |

### Steering 산출물

| 파일 | 적용 범위 | 역할 |
|---|---|---|
| `.kiro/steering/backend-guide.md` | `backend/**` 편집 시 자동 참조 | 백엔드 API 계약, 검증 순서, 알고리즘 |
| `.kiro/steering/frontend.md` | `frontend/**` 편집 시 자동 참조 | 프론트엔드 개발 규칙, API 연결, 화면 동작 |
| `.kiro/steering/ui-guide.md` | `frontend/**` 편집 시 자동 참조 | UI 색상, 컴포넌트, 이미지 규칙 |

---

## 미완료 항목

| 항목 | 상태 |
|---|---|
| 프론트엔드-백엔드 통합 테스트 결과 문서화 | 커밋 메시지("백엔드 연결") 기준으로 연결 확인됐으나 세부 결과 미기록 |
| 배포 환경 및 접속 URL | 미확정 |
| Demo 영상 | 미제작 |
| 스와이프 투표 | 향후 과제로 정리 |
