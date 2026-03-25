# 🗺️ score-fetcher 개발 로드맵
### `Current Version: v1.1.0` (2026.03.25)

> 최종 목표: 웹 PWA → Capacitor 기반 Android / iOS 네이티브 앱 출시

---

## 현재 상태 (2026-03-25 기준, 최종 업데이트: 17:12)

| 항목 | 상태 |
|------|------|
| 웹 PWA (Vercel 배포) | ✅ 운영 중 |
| 콘티 저장 / 불러오기 (Firebase) | ✅ 운영 중 |
| 콘티 이미지 공유 | ✅ 운영 중 |
| FCM 클라이언트 설정 (토큰 등록) | ✅ 운영 중 |
| Cloud Function (새 콘티 알림 발송) | ✅ 운영 중 |
| 오프라인 지원 (악보 사전 캐싱 + 콘티함 로컬 캐시) | ✅ 운영 중 |
| Digital Maestro 디자인 리뉴얼 | ✅ 적용 완료 (2026-03-24) |
| **관리자 대시보드 (admin.html) 구축** | ✅ 배포 완료 (2026-03-25) |
| **곡 목록 / 가사 Firebase DB 마이그레이션** | ✅ 완료 (2026-03-25) |
| **곡/가사 오프라인 캐싱 (Stale-While-Revalidate)** | ✅ 적용 완료 (2026-03-25) |
| Android 앱 | ❌ 미착수 |
| iOS 앱 | ❌ 미착수 |

---

## 최근 작업 이력 (2026-03-25)

### 🏷️ 릴리즈 버전 시스템 도입 (`v1.1.0`) — 17:45
- **구성**: 시맨틱 버저닝(v1.1.0) + 빌드 일자(Build 2026.03.25) 조합
- **위치**: 메인 앱 및 **관리자 대시보드(Admin)** 최하단에 표시
- **관리**: `js/utils.js` (앱용) 및 `admin.html` (대시보드용)에서 통합 관리

### 🐛 관리자 페이지 세션 만료(로그아웃) 버그 수정 — 17:45
- **원인**: 메인 앱(`index.html`) 로드 시 무조건적인 `signInAnonymously()` 호출로 인해 기존 구글 로그인 세션이 익명 세션으로 교체되어 `admin.html` 탭이 이를 감지하고 강제 로그아웃 시키는 현상
- **수정**: `js/firebase.js`의 인증 감시 로직을 개선하여, 이미 로그인된 사용자가 있을 경우 익명 로그인을 건너뛰도록 처리

### 🐛 콘티 공유 버튼 클릭 시 팝업만 닫히는 버그 수정 (`js/share.js`) — 17:12
- **원인**: 공유 실행 전 전역 변수(`_shareFile` 등)가 `null`로 초기화되어 공유 API 동작 불가
- **수정**: 지역 변수 선언을 통해 파일 객체를 안전하게 보존한 뒤 공유하도록 로직 개선

### 🐛 새 찬양 등록 후 메인 앱 목록 미갱신 버그 수정 (`js/song-list.js`) — 17:18
- **원인**: 메모리 캐시(`songArray`)가 존재할 경우 Firebase 재조회를 생략하는 분기문
- **수정**: **SWR(Stale-While-Revalidate) 패턴**을 강화하여, 캐시로 즉시 렌더링하되 백그라운드에서 항상 Firebase 최신 데이터를 확인하도록 수정

### 🛠️ 관리자 대시보드 (`admin.html`) 사용성 개선 — 17:38
- **진단기 캐시 버그 수정**: `checkOrphanImages()` 실행 시 브라우저 캐시 때문에 새로 등록한 곡이 목록에서 안 지워지던 문제 → fetch 주소에 타임스탬프 추가로 해결
- **UX 개선**: 곡 등록 성공 시 하단 진단기 결과 목록을 자동으로 최신화하도록 로직 보강
- 앱 화면 이동 버튼 클릭 시 현재 창이 아닌 **새 탭(`target="_blank"`)**으로 열리도록 수정하여 관리자 페이지 유지 가능토록 변경

### 🛠 관리자 대시보드 (`admin.html`) 구축 & 기능 확장 — 17:00 (이전 작업)
- `importer.html`을 `admin.html`로 리팩토링, 탭 인터페이스 도입
- **탭 1 : 역대 콘티 관리**
  - Firebase 전체 이력 페이징(15건) 리스트 + 제목/날짜 실시간 검색
  - 곡 목록 개행 보존 요약 (최대 3줄) 인라인 표시
  - 단일 삭제: 팝업 없이 "삭제 중..." 레이블 후 부드러운 페이드아웃(0.4s)
  - 다중 체크박스 선택 일괄 삭제
  - 데이터 검사기: ①제목없음 날짜 자동 복구(`YYYY-MM-DD 콘티`) ②특송/광고/빈 곡 의심 데이터 리스트업 ③초기 테스트 데이터 일괄 삭제
- **탭 2 : 새 찬양 등록기** (신규)
  - 곡 번호 + 제목 즉시 Firebase `songs/` 등록
  - 가사 즉시 Firebase `lyrics/` 등록
  - **Git vs Firebase DB 교차 진단기**: Github API로 `images/` 폴더와 DB 곡 목록을 비교, 누락 곡 번호를 클릭 한 번으로 입력칸에 자동 채워줌
- **탭 3 : 대량 임포트 도구** (기존 유지)
- **탭 4 : 곡/가사 DB 통폐합** (기존 유지)
- **보안**: 익명 로그인 → Google 로그인 전환, `jeiel85@gmail.com` 화이트리스트 인증

### 🚀 곡/가사 오프라인 캐싱 아키텍처 도입 (`js/song-list.js`)
- 기존 `hymn_list.txt` / `lyrics.json` 로컬 파일 → Firebase Realtime DB 실시간 연동으로 마이그레이션
- **Stale-While-Revalidate 패턴** 적용:
  1. 앱 실행 즉시 `localStorage` 캐시에서 곡 목록/가사 0ms 로딩 (오프라인 완벽 지원)
  2. 백그라운드에서 Firebase `songs/` + `lyrics/` 최신 데이터 비교
  3. 변경분 있을 때만 조용히 화면 갱신 + 캐시 자동 업데이트
- `CACHE_KEY_SONGS = 'cachedSongsData_v2'`, `CACHE_KEY_LYRICS = 'cachedLyricsData_v2'`

### 🗄 Firebase Realtime Database 보안 규칙 업데이트
- `/songs` / `/lyrics` 경로 추가 (인증 사용자 읽기/쓰기 허용)
- `firebase deploy --only database` 클라우드 배포 완료

---

## Phase 1 — FCM 푸시 알림 ✅ 완료

### 구현 완료 항목
- Cloud Function 배포 (`us-central1`) — `/history/{id}` 생성 감지 → FCM 발송
- 알림 제목: `새 콘티가 등록되었습니다 ♬` (고정)
- 알림 본문: `[콘티제목] 곡1 · 곡2 · ...` (번호 있는 곡 최대 4개)
- 발신자 본인 제외 (`senderToken` 필터링)
- 포그라운드/백그라운드 모두 시스템 알림으로 표시
- 알림 클릭 시 최신 콘티 자동 로드 + 악보 만들기 자동 실행
- 중복 토큰 dedup, 만료 토큰 자동 정리
- 서비스워커 즉시 활성화 (`skipWaiting` + `clients.claim`)

---

## Phase 2 — Capacitor Android / iOS 포팅

### Capacitor란?

> 기존 HTML/CSS/JS 웹 코드를 **그대로 유지**하면서 Android와 iOS 앱으로 빌드하는 프레임워크

```
현재 웹 코드 (index.html)
        ↓ npx cap sync
   Capacitor WebView
   ┌────────────────────────────┐
   │  Android (android/)        │   → Play Store
   │  iOS     (ios/)            │   → App Store
   └────────────────────────────┘
```

**iOS 대응 여부: ✅ 동일 코드베이스로 Android + iOS 동시 빌드 가능**

### 소스 형상 관리 전략

```
score-fetcher/              ← 기존 레포 그대로 확장
├── index.html              ← 웹/앱 공통 소스 (변경 없음)
├── firebase-config.js
├── firebase-messaging-sw.js
├── functions/              ← Cloud Functions (변경 없음)
├── android/                ← Capacitor 생성 (신규)
│   └── app/
├── ios/                    ← Capacitor 생성 (신규)
│   └── App/
└── capacitor.config.json   ← Capacitor 설정 (신규)
```

**브랜치 전략**: 기존 동일 (`feature/*` → `main`)
- 웹 변경: 기존 방식 그대로
- 네이티브 변경: 같은 브랜치에서 `android/`, `ios/` 수정
- `npx cap sync` 로 웹 → 네이티브 동기화

### 필요 도구
- Node.js, npm
- Android Studio (Android 빌드)
- Xcode + Mac (iOS 빌드)
- `@capacitor/core`, `@capacitor/cli`

### FCM 변경 사항 (중요)

Capacitor 앱에서는 웹 SDK FCM이 아닌 **네이티브 FCM 플러그인**을 사용해야 합니다.

| | 현재 웹 | Capacitor 앱 |
|--|---------|--------------|
| FCM SDK | `firebase.messaging()` (웹) | `@capacitor-firebase/messaging` |
| 서비스 워커 | `firebase-messaging-sw.js` | 불필요 (네이티브 처리) |
| 백그라운드 알림 | 브라우저 제한 있음 | 완전 지원 |
| 토큰 등록 | `getToken()` | 플러그인 API |

> **전략**: 웹/앱 분기 처리 (`Capacitor.isNativePlatform()` 감지)
> - 웹: 기존 Firebase 웹 SDK 유지
> - 앱: Capacitor FCM 플러그인 사용

### 포팅 단계
1. `npm init @capacitor/app` 으로 Capacitor 초기화
2. `npx cap add android` / `npx cap add ios`
3. FCM 플러그인 설치 및 분기 처리
4. `npx cap sync` → Android Studio / Xcode 빌드 테스트
5. Play Store / App Store 배포 준비 (서명, 아이콘, 스크린샷)

---

## Phase 3 — 스토어 출시

| 항목 | Android (Play Store) | iOS (App Store) |
|------|----------------------|-----------------|
| 빌드 도구 | Android Studio | Xcode (Mac 필수) |
| 서명 | Keystore 파일 | Apple 개발자 계정 ($99/년) |
| 심사 | 보통 1-3일 | 보통 1-7일 |
| 업데이트 | `npx cap sync` → 재빌드 | 동일 |

---

## 전체 일정 (참고)

```
Phase 1   FCM 정상화          빠르면 당일 (배포 + 검증)
Phase 2a  Capacitor Android   1-2주 (환경 세팅 + FCM 분기 처리)
Phase 2b  Capacitor iOS       +1주 (Mac/Xcode 환경 필요)
Phase 3   스토어 출시          심사 기간 포함 2-3주
```
