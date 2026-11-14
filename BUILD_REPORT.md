# BUILD_REPORT.md — 아무거나 말고

> **작성 범위**: 백엔드(혜린) 개발 과정의 Kiro 활용 내역  
> **작성 기준**: Spec 문서, Git 커밋 기록, 실제 생성된 산출물  
> **작성일**: 2026-11-14 (해커톤 당일)

---

## 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 서비스명 | 아무거나 말고 |
| 개발 형태 | 5시간 해커톤, 2인 병렬 개발 |
| 백엔드 담당 | 혜린 |
| 프론트엔드 담당 | 주영 |
| 백엔드 브랜치 | `backend` |

---

## 백엔드 개발 타임라인

| 시각 | 커밋 / 작업 | 내용 |
|---|---|---|
| 14:37 | `Add backend steering` | `.kiro/steering/backend-guide.md` 초안 생성 |
| 15:24 | `아무거나 말고 스펙 문서 추가` | 주영이 `requirements.md`, `design.md`, `tasks.md` 커밋 (main → backend 병합) |
| 15:44 | `Update backend steering to match specs` | Spec과 대조 후 Steering 전면 개정 |
| 16:20 | `Complete backend API implementation` | 백엔드 파일 5개 신규 생성, `main.py` 전면 작성 |

---

## Kiro 활용 내역

### 1단계 — Spec 작성 및 검토

| 항목 | 내용 |
|---|---|
| **사용 기능** | Kiro Chat (Vibe 세션) |
| **활용 방법** | 작성 예정인 개발 규칙을 프롬프트로 입력하여 Backend Steering 초안 생성 요청 |
| **산출물** | `.kiro/steering/backend-guide.md` 초안 (커밋 `7546822`) |
| **후속 작업** | Spec 3개 파일(`requirements.md`, `design.md`, `tasks.md`)이 확정된 뒤 Kiro에게 Steering과 Spec의 불일치 항목 비교 분석 요청 → 5가지 불일치 항목 보고 수령 |

**발견된 불일치 항목 (Kiro 분석 결과)**

| 항목 | 내용 |
|---|---|
| ① 빈 appeal 처리 | "모든 어필멘트 보존"이 빈 문자열 포함으로 오독될 수 있음 → Spec 기준으로 수정 |
| ② 거부권 싫어요 집계 | 거부 대상 후보에도 dislike 1표 집계한다는 규칙 누락 |
| ③ 투표 시작 조건 | "통합 후 후보 2개 이상" 조건이 Steering에 미기재 |
| ④ `/start` 요청 본문 | `member_id` 필드 필요함이 미기재 |
| ⑤ topic 길이 제한 | 1~50자 제한이 Steering에 누락 |

---

### 2단계 — Backend Steering 개정

| 항목 | 내용 |
|---|---|
| **사용 기능** | Kiro Chat + `fileMatch` Steering |
| **활용 방법** | Spec 3개 파일을 기준으로 Steering 전면 재작성 요청. API 계약, 검증 순서, 알고리즘, 오류 코드를 Spec과 1:1 대응 |
| **산출물** | `.kiro/steering/backend-guide.md` 개정본 (커밋 `ff13d54`, +403줄) |
| **적용 범위** | `backend/**` 파일 편집 시 자동 참조 (`fileMatchPattern: "backend/**"`) |

**Steering에 반영된 핵심 규칙 목록**

- API 6개의 경로·메서드·요청·응답 JSON 예시
- 엔드포인트별 검증 순서 (5개 × 최대 7단계)
- HTTP 상태 코드 매핑표 및 주요 `detail` 문구
- `normalize()` 함수 코드 및 중복 통합 규칙
- 결과 계산 순서 (거부권 → 좋아요 → 싫어요 → 동점 랜덤)
- 추천인 익명성 규칙 (상황별 공개/비공개 표)
- 메모리 저장소 데이터클래스 정의

---

### 3단계 — 백엔드 API 구현 (Task 8–13)

| 항목 | 내용 |
|---|---|
| **사용 기능** | Kiro Chat + Backend Steering 자동 참조 |
| **활용 방법** | `tasks.md`의 백엔드 Task 8~13을 순서대로 구현 요청. Steering이 자동 참조되어 Spec 규칙을 별도 반복 없이 적용 |
| **산출물** | `backend/` 파일 5개 신규 생성 (커밋 `95222e1`, +712줄) |

**생성된 파일**

| 파일 | 역할 |
|---|---|
| `main.py` | FastAPI 앱, CORS, 라우트 6개, 예외 핸들러 |
| `errors.py` | `ApiError(status_code, detail)` 통일 오류 클래스 |
| `schemas.py` | 요청·응답 Pydantic 모델 전체 |
| `store.py` | 메모리 저장소, 데이터클래스 5개, `threading.Lock` |
| `services.py` | 검증 로직, `normalize()`, `merge_candidates()`, `compute_result()` |

**구현된 API**

| Method | 경로 | 역할 |
|---|---|---|
| POST | `/api/rooms` | 방 만들기 |
| POST | `/api/rooms/{code}/join` | 참여 |
| POST | `/api/rooms/{code}/candidates` | 후보 제출 |
| POST | `/api/rooms/{code}/start` | 투표 시작 + 중복 통합 |
| POST | `/api/rooms/{code}/votes` | 투표 제출 + 결과 계산 |
| GET  | `/api/rooms/{code}` | 방 상태 조회 |

---

### 4단계 — 구현 검증

| 항목 | 내용 |
|---|---|
| **사용 기능** | Kiro Chat (API 호출 스크립트 생성 및 실행) |
| **활용 방법** | Spec의 엣지 케이스를 시나리오로 구성해 실제 서버에 curl 호출, 결과를 Python으로 자동 검증 |
| **검증 방식** | 서버를 백그라운드 프로세스로 실행 후 HTTP 응답 코드와 JSON 필드를 직접 assert |

**검증한 시나리오**

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

## 미완료 / 추후 작성 섹션

### 프론트엔드 Kiro 활용 내역 (미작성)

> 주영의 프론트엔드 작업 내역. Task 1~7(React + TypeScript + Vite 구현)에서의 Kiro 활용 방식, 생성 산출물, 검증 결과를 작성 예정.

### 통합 검증 (미작성)

> `USE_MOCK = false` 전환 후 프론트엔드-백엔드 연동 테스트 결과를 작성 예정.  
> 대상: 방 만들기부터 결과 화면까지 전체 흐름 1회 완주.

### 배포 / 실행 환경 (미작성)

> 해커톤 당일 실제 실행 환경(로컬 or 외부 접속), 발생한 이슈, 해결 방법을 작성 예정.

---

## 산출물 목록

| 파일 | 종류 | 커밋 |
|---|---|---|
| `.kiro/steering/backend-guide.md` | Kiro Steering | `7546822`, `ff13d54` |
| `backend/main.py` | 백엔드 구현 | `6438218`, `95222e1` |
| `backend/errors.py` | 백엔드 구현 | `95222e1` |
| `backend/schemas.py` | 백엔드 구현 | `95222e1` |
| `backend/store.py` | 백엔드 구현 | `95222e1` |
| `backend/services.py` | 백엔드 구현 | `95222e1` |
| `backend/requirements.txt` | 의존성 | `95222e1` |
