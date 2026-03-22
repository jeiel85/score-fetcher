# 🗺️ score-fetcher 개발 로드맵

> 최종 목표: 웹 PWA → Capacitor 기반 Android / iOS 네이티브 앱 출시

---

## 현재 상태 (2026-03-22 기준)

| 항목 | 상태 |
|------|------|
| 웹 PWA (Vercel 배포) | ✅ 운영 중 |
| 콘티 저장 / 불러오기 (Firebase) | ✅ 운영 중 |
| 콘티 이미지 공유 | ✅ 운영 중 |
| FCM 클라이언트 설정 (토큰 등록) | ✅ 코드 완료 |
| Cloud Function (새 콘티 알림 발송) | ⚠️ 배포 필요 |
| Android 앱 | ❌ 미착수 |
| iOS 앱 | ❌ 미착수 |

---

## Phase 1 — FCM 푸시 알림 정상화

> 코드는 완성, 배포 및 검증만 남은 단계

### 할 일
1. Cloud Function 배포
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```
2. 기기에서 "🔔 알림 활성화" 버튼 클릭 → 권한 허용
3. Firebase Console → Realtime Database → `/fcm_tokens` 에 토큰 등록 확인
4. 콘티 저장 → 다른 기기에서 알림 수신 확인

### 알림 형식
- **제목**: `🎶 콘티제목`
- **본문**: 번호 있는 곡 줄 최대 4개 요약 (예: `1. 주의 이름 높이세 · 2. 찬양하라`)

### 예상 이슈
- 브라우저 자동 알림 권한 차단 → 반드시 버튼 클릭으로 요청
- 포그라운드: 토스트 메시지 / 백그라운드: 시스템 알림

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
