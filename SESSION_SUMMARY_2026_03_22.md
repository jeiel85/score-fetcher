# 📝 2026-03-22 세션 작업 요약

오늘 세션에서 진행된 전체 작업 내용입니다. 작업 브랜치: `claude/project-analysis-briefing-k7yQF`

---

## ✅ 주요 작업 내용

### 1. FCM 푸시 알림 내용 개선 (`functions/index.js`)
- 알림 **제목**: 고정 문구 → `🎶 콘티제목` (실제 제목 반영)
- 알림 **본문**: `콘티제목 - 지금 확인해보세요!` → 번호로 시작하는 곡 줄 최대 4개 요약
  - 예) `1. 주의 이름 높이세 · 2. 찬양하라 내 영혼아 · 3. 주님 한 분만으로`
  - 번호 있는 곡이 없으면 첫 3줄로 대체

### 2. 공유 시 자동 저장 (`index.html`)
- `shareConti()` 호출 시 `saveToHistory()` 자동 실행 (알림 없이 silent 저장)
- "콘티 공유하기" 버튼 하나로 저장 + 공유 동시 처리

### 3. 이력 항목 길게 누르기 네이티브 팝업 차단 (`index.html`)
- `.history-item` CSS에 `user-select: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none` 추가
- `contextmenu` 이벤트 `preventDefault`로 Android/iOS/데스크톱 팝업 모두 차단

### 4. 버튼 이름 및 위치 전면 개편 (`index.html`)

| 이전 | 이후 |
|------|------|
| 📖 찬양 목록 | 📖 찬양 목록/추가 |
| 🕒 콘티 이력 | 🕒 콘티함 |
| 💡 화면 ON (제거) | 초기화 🔄 (상단으로 이동) |
| 악보 찾기 🔍 | 악보 만들기 🎵 |
| 저장 💾 | 콘티함에 저장 💾 |
| 공유 🖼️ | 콘티 공유하기 🖼️ |

- 하단 btn-row: 3개 → 2개 (초기화 제거, 나머지 버튼이 더 넓어짐)
- top-btn 폰트 12px / 패딩 6px로 긴 텍스트 3개 한 줄 대응

### 5. Wake Lock 항상 ON (`index.html`)
- `toggleWakeLock()`, `isWakeLockEnabled` 변수 제거
- `initWakeLock()`이 첫 터치 및 탭 복귀 시 자동 재획득
- UI에서 화면 ON/OFF 버튼 완전 제거

---

## 📦 커밋 이력

| 커밋 | 내용 |
|------|------|
| `2fc5045` | feat: 버튼 이름·위치 개편 + Wake Lock 항상 ON |
| `296bbdc` | fix: 이력 항목 길게 누를 때 네이티브 팝업 차단 |
| `aaf150e` | feat: 공유 시 자동 저장 + 푸시 알림에 콘티 제목·곡 목록 요약 추가 |

---

## 🔍 푸시 알림 미동작 원인 분석

현재 푸시가 동작하지 않는다면 아래 순서로 확인하세요.

1. **Cloud Function 미배포** (가장 유력)
   ```bash
   cd functions && npm install
   firebase deploy --only functions
   ```
2. **알림 권한 미허용** — "🔔 알림 활성화" 버튼을 직접 눌러 허용해야 토큰 등록됨
   - 브라우저가 자동 권한 요청을 차단하므로, 사용자 제스처가 필수
3. **토큰 미등록 확인** — 브라우저 콘솔: `localStorage.getItem('fcm_token')`
4. **Firebase DB 토큰 확인** — Realtime Database `/fcm_tokens` 경로에 값 존재 여부
5. **앱 포그라운드 상태** — 앱 열린 상태에서는 서비스 워커 알림 대신 화면 상단 토스트로 표시됨

---

## 🚀 다음 단계

- `firebase deploy --only functions` 로 Cloud Function 배포
- 테스트: 알림 활성화 → 콘티 저장 → 다른 기기에서 알림 수신 확인
