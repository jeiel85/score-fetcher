# 📜 Score Fetcher 통합 가이드 (Integrated Guide)

이 문서는 **콘티 메이커 (Score Fetcher)** 프로젝트의 아키텍처, 코드 규칙, 작업 흐름, 그리고 에이전트 지침을 통합한 **단일 진실 공급원(Single Source of Truth)**입니다.

---

## 🤖 1. 에이전트 개발 지침 (Project Agents Guide)

### 핵심 철학 및 아키텍처
- **No Framework**: React/Vue 없이 **Vanilla JS**만 사용합니다.
- **REST over SDK**: Firebase Database는 직접적인 **REST API(fetch)** 호출을 기본으로 합니다. (FCM은 SDK 사용)
- **Offline First**: 모든 데이터는 `localStorage`에 1차 캐싱하여 0ms 로딩을 보장합니다.

### ⚠️ 절대 불변의 UX 원칙
- **전체화면 뷰어 자동 오픈 금지**: 사용자가 카드를 **직접 클릭**할 때만 열려야 합니다.
- **가로 모드(Landscape) 자동 전환**: 세로에서 악보 생성 후 회전 시 **분할 뷰(`ls-active`)**가 자동 활성화되어야 합니다.
- **currentSheetIndex 초기값은 `-1`**: `0`으로 설정 시 선택 안 함 상태 구분이 불가능합니다.
- **UI 오버레이 자동 숨김**: 뷰어 헤더/버튼은 3초 후 자동 페이드아웃 및 탭 토글이 되어야 합니다.

---

## 📋 2. 작업 지침 및 이슈 대응 (Workflow)

### 작업 전 필수 프로토콜
```bash
1. git fetch origin
2. git checkout main
3. git pull origin main      # ⚠️ 반드시 최신 소스 먼저 다운로드
4. git status                # 깨끗한 상태에서 시작
```

### 이슈 대응 흐름
1. **분석**: GitHub 이슈 확인 및 중복 여부 체크.
2. **브랜치**: `feat/issue-{번호}-{설명}` 형식으로 생성.
3. **구현**: 기존 코드 패턴 준수 및 문법 검수.
4. **커밋**: `feat/fix: #{번호} {설명}` (한글 메시지 권장).
5. **PR/머지**: PR 생성 후 관리자 머지 및 이슈 종료.

---

## 🔢 3. 버전 관리 규칙 (5-Point Sync)

버전 업 시 아래 **5곳을 동시에** 수정해야 합니다.

| 파일 | 위치 | 용도 |
| :--- | :--- | :--- |
| `js/utils.js` | `APP_VERSION`, `BUILD_DATE` | 실제 화면 표시용 |
| `index.html` | `const VERSION` | 캐시 무효화 판별용 |
| `index.html` | `.app-version-badge` (2곳) | 초기 HTML 렌더용 |
| `README.md` | 상단 배지 및 변경이력 | 외부 공개용 정보 |
| `source_history.md` | 최상단 마일스톤 추가 | 상세 개발 이력 기록 |

---

## 📁 4. 프로젝트 구조 및 데이터

```
score-fetcher/
├── index.html           # 메인 UI
├── admin.html           # 관리자 대시보드
├── style.css            # 전체 스타일
├── js/
│   ├── firebase.js      # 초기화 및 익명 인증
│   ├── utils.js         # 유틸리티 및 버전 관리
│   ├── history.js       # 콘티 이력 관리
│   ├── song-list.js     # 찬양 목록 및 검색
│   ├── sheet-viewer.js  # 악보 뷰어 로직
│   ├── push.js          # FCM 푸시 알림
│   ├── share.js         # 이미지 생성 및 공유
│   └── notifications.js # 알림센터
├── functions/           # Cloud Functions (FCM 발송)
├── lyrics.json          # 가사 데이터
└── hymn_list.json       # 곡 목록 데이터
```

---

## 🛠️ 5. 시행착오 및 해결책 (Lessons Learned)
- **관리자 세션 덮어쓰기**: 메인 앱의 익명 로그인이 관리자 로그인을 풀지 않도록 `admin.html`에서는 익명 로그인을 호출하지 않음.
- **PATCH 방식 필수**: 데이터 수정 시 `PUT` 대신 `PATCH`를 사용하여 기존 필드 유실 방지.
- **푸시 중복 방지**: 기기 핑거프린트(`device_id`) 기반으로 토큰 키를 관리하여 중복 발송 차단.
- **카톡 공유 중복**: `text` 파라미터에서 URL을 제거하여 Android 카카오톡 중복 노출 해결.

---

## 🔗 관련 문서
- [상세 변경 이력 (Source History)](source_history.md)
- [개발 로드맵 (Roadmap)](ROADMAP.md)

*최종 업데이트: 2026-04-21*
