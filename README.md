# 🎵 콘티 메이커 (Conti Maker)
### Premium Praise Setlist & Sheet Music Manager

> **콘티 입력부터 악보 검색, 전체화면 뷰어, 실시간 이력 공유, 푸시 알림까지 — 찬양팀 리더를 위한 스마트 워크플로우 도구**

[![배포](https://img.shields.io/badge/배포-score--fetcher.vercel.app-000?style=flat-square&logo=vercel&logoColor=white)](https://score-fetcher.vercel.app/)
[![관리자](https://img.shields.io/badge/관리자-admin.html-indigo?style=flat-square&logo=google-cloud&logoColor=white)](https://score-fetcher.vercel.app/admin.html)
![Version](https://img.shields.io/badge/version-v1.13.0-blue?style=flat-square)
![Build](https://img.shields.io/badge/build-2026.04.15-indigo?style=flat-square)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

---

## 📌 프로젝트 소개

흩어져 있는 찬양 악보를 **곡 번호 하나로 즉시 검색**하고, 지난 콘티를 팀원 모두와 **실시간으로 공유**할 수 있는 웹 앱입니다.
별도 앱 설치 없이 브라우저만으로 동작하며, 예배 현장의 실제 불편함을 해결하기 위해 만들어졌습니다.

---

## ✨ 주요 기능

### 🔍 지능형 악보 검색
- **포맷 자동 정제** — `1. 제목`, `05.제목`, `685 . 제목` 등 어떤 형식이든 `001 제목`으로 자동 정규화 (Regex)
- **다중 확장자 시도** — `.jpg → .png → .gif → .jfif → .JPG → .PNG → .GIF → .JFIF` 순서로 이미지 자동 탐색
- **693곡 악보 이미지** 내장

### 🖼 전체화면 악보 뷰어
- **전체화면 모드** — 악보 카드 클릭 시 전체화면 뷰어로 전환
- **좌우 네비게이션** — 화살표 버튼 또는 좌우 스와이프로 악보 이동
- **하단 스와이프 닫기** — 아래로 드래그하면 뷰어 종료
- **현재 위치 표시** — 헤더에 `곡명 (현재/전체)` 형식으로 표시

### 📋 콘티함 (저장 & 불러오기)
- **Firebase Realtime Database** 연동으로 콘티를 즉시 저장·공유
- **원클릭 복원** — 이력 목록에서 클릭하면 제목과 곡 목록이 입력창에 바로 채워짐
- **공유 시 자동 저장** — "콘티 공유하기" 버튼 클릭 시 자동으로 콘티함에 저장
- **페이지 단위 로드** — 이력을 20개씩 불러오고 "더 보기"로 추가 조회
- **타임스탬프** — 저장 날짜·시간을 이력 카드에 함께 표시
- **길게 누르기 삭제** — 이력 항목 700ms 길게 누르면 삭제 확인 (네이티브 팝업 차단)

### 🔔 FCM 푸시 알림
- **새 콘티 자동 알림** — 콘티 저장 시 등록된 팀원 기기에 푸시 알림 발송 (발신자 본인 제외)
- **알림 내용** — 제목: `새 콘티가 등록되었습니다 ♬`, 본문: `[콘티제목] 곡1 · 곡2 · ...` (최대 4곡)
- **포그라운드 알림** — 앱이 열린 상태에서도 시스템 알림(상단바)으로 표시
- **알림 클릭 시 자동 로드** — 최신 콘티를 불러오고 악보 만들기 자동 실행
- **Firebase Cloud Functions** — 서버리스 함수로 알림 처리 (`us-central1`)
- **중복·만료 토큰 자동 정리** — 중복 등록된 토큰 제거, 발송 실패 토큰 DB에서 자동 삭제

### 📖 전체 곡 목록 & 퀵 인덱스
- **691+곡 내장** — Firebase DB 연동을 통한 실시간 곡 목록 관리
- **퀵 인덱스 바** — 600곡이 넘는 리스트를 100단위로 즉시 점프하는 내비게이터 (Apple 스타일)
- **가사 오류 신고** — 사용자가 즉시 오류를 제보하고 관리자가 대시보드에서 처리하는 시스템

### 💡 하이엔드 사용성
- **강제 업데이트 시스템** — 새 빌드 배포 시 기기 버전 체크를 통해 사용자에게 최신 버전을 실시간으로 강제 적용합니다.
- **화면 꺼짐 방지** — 앱 사용 중 화면 자동 꺼짐 항상 차단 (Wake Lock API)
- **반응형 관리자 페이지** — 모바일/PC 어디서나 콘티와 곡 데이터를 관리하는 강력한 대시보드
- **PWA 지원** — 홈 화면 추가를 통해 앱처럼 설치하고 실행

### 🔗 소셜 공유 (Open Graph)
- 카카오톡, 슬랙 공유 시 **블랙 테마 프리미엄 카드** 이미지(`og-image.png`) 표시

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Database | Google Firebase Realtime Database |
| 서버리스 함수 | Firebase Cloud Functions v2 (Node.js) |
| 푸시 알림 | Firebase Cloud Messaging (FCM) |
| PWA | Web App Manifest, Service Worker |
| 추가 API | Screen Wake Lock API |
| 배포 | Vercel |

---

## 📁 프로젝트 구조

```
score-fetcher/
├── index.html              # 메인 앱 (v1.5.6)
├── admin.html              # 관리자 대시보드 (통합 관리 툴)
├── manifest.json           # PWA 설정
├── firebase-messaging-sw.js  # FCM 서비스 워커
├── icon.png                # 앱 아이콘 (512x512, Black Theme)
├── og-image-premium.png    # 링크 공유용 프리미엄 블랙 카드 이미지
├── images/                 # 악보 이미지 (001.png, 002.jpg, ..., 693곡)
└── functions/              # Firebase Cloud Functions
    ├── index.js            # 새 콘티 저장 시 FCM 푸시 발송 함수
    └── package.json
```

---

## 📊 데이터 흐름

```
사용자 입력 (콘티 목록)
        ↓
Regex 정제 → 번호 표준화 (NNN 형식)
        ↓
이미지 탐색 (jpg → png → gif → jfif 순서로 시도)
        ↓
악보 카드 렌더링
        ↓
[카드 클릭] → 전체화면 뷰어 (스와이프/버튼 네비게이션)

[저장 버튼 클릭]
        ↓
Firebase Realtime DB에 콘티 저장
        ↓
Cloud Functions 트리거 → 전체 팀원에게 FCM 푸시 알림 발송
```

---

## 🚀 설치 및 설정

### 1. Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. **Realtime Database** 활성화 (테스트 모드로 시작)
3. **Cloud Messaging** 활성화 → 웹 푸시 인증서(VAPID 키) 발급

### 2. `index.html` 상수 수정

```js
const FIREBASE_CONFIG = {
    apiKey:            "YOUR_API_KEY",
    authDomain:        "YOUR_PROJECT.firebaseapp.com",
    databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId:         "YOUR_PROJECT",
    storageBucket:     "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId:             "YOUR_APP_ID"
};
const VAPID_KEY = "YOUR_VAPID_KEY";
```

### 3. 악보 이미지 업로드

```
images/ 폴더에 곡 번호와 일치하는 파일 업로드
예시: 001.jpg, 022.png, 685.gif
지원 포맷: .jpg .png .gif .jfif (대소문자 모두 지원)
```

### 4. Firebase 익명 인증 활성화

Firebase Console → Authentication → Sign-in method → **익명** 활성화
(DB 보안 규칙: `auth != null` — 인증된 사용자만 읽기/쓰기 허용)

### 5. Firebase Cloud Functions 배포 (푸시 알림)

```bash
npm install -g firebase-tools
firebase login
firebase use YOUR_PROJECT_ID
cd functions && npm install
firebase deploy --only functions
```

### 6. Vercel 배포

```bash
# Vercel CLI 사용
npx vercel --prod

# 또는 GitHub 저장소와 Vercel 연동 후 자동 배포
```

---

## 🔄 변경 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| **v1.13.0** | **2026.04.15** | **악보 스와이프 프리로드 개선 (decode() + 스와이프 완료 후 즉시 프리로드), 콘티 제목 날짜-제목 공백 자동 삽입 (blur 즉시 반영)** |
| v1.12.4 | 2026.04.15 | 스와이프 완료 후 이전 악보 깜빡임 수정 — imgEl opacity 크로스페이드로 순간이동 플래시 제거 (전체화면·가로 뷰어 공통) |
| **v1.12.2** | **2026.04.14** | **스와이프 완료 후 다음 악보 로딩 중 깜빡임(Flickering) 현상 수정** |
| **v1.12.1** | **2026.04.14** | **스와이프 버그 수정 — 첫/마지막 페이지 드래그 제거, 스와이프 완료 후 역방향 슬라이드 글리치 수정** |
| **v1.12.0** | **2026.04.14** | **악보 뷰어 스와이프 개선 — 다음/이전 페이지 함께 슬라이드, 첫/마지막 페이지 감쇠 효과, 천천히 드래그도 작동** |
| **v1.11.5** | **2026.04.14** | **리얼타임 스와이프 - 손 따라 악보 이동 + 다음 악보 프리로딩** |
| **v1.11.4** | **2026.04.11** | **악보 카드 가로 오버플로우 수정 (#126), 저장 후 공유 시 콘티 중복 저장 방지 (#127)** |
| v1.11.3 | 2026.04.11 | GitHub/버전/관리자 링크 → 설정 모달로 이동, 가로 모드 우측 패널 높이 좌측과 일치 |
| v1.11.2 | 2026.04.11 | 찬양 목록 가사/악보 버튼 크기 통일 — 태블릿 미디어 쿼리에서 btn-score도 btn-lyrics와 동일하게 적용 |
| v1.11.1 | 2026.04.11 | 찬양목록 UX 개선 6건 (#120~#125) |
| **v1.10.0** | **2026.04.09** | **알림센터 전체 타입 구현 + 콘티 수정 기능 — lyrics_report·new_song·admin_conti·announcement 알림 연동, 불러온 콘티 수정 모드, admin 인라인 수정** |
| v1.9.0 | 2026.04.09 | 새찬송가 탭 추가 — 찬양 목록 모달에 찬송가 탭(645곡), 찬NNN 프리픽스로 CCM과 혼합 콘티 지원 |
| v1.8.1 | 2026.04.08 | #119 악보 업로드 개선 — 전/후 비교 모달(풀스크린), 확장자 충돌 자동 처리, .jpeg→.jpg 정규화, 성공 후 폼 초기화 |
| v1.8.0 | 2026.04.08 | 알림센터 추가 — 공지/신규곡/가사신고/콘티수정 알림, 미읽음 배지, 전체 읽기 |
| v1.7.2 | 2026.04.06 | 가로 모드 제목/돌아가기 헤더도 자동 숨김 (#118) |
| v1.7.1 | 2026.04.05 | 가로 뷰어 좌/우 버튼 3초 후 자동 숨김 + 탭 토글 (#117) |
| v1.7.0 | 2026.04.02 | 세로 전체화면→가로 회전 시 분할뷰 자동 전환, 전체화면 헤더/푸터 오버레이 자동 숨김, 가로모드 슬라이드 애니메이션 복원 |
| v1.6.4 | 2026.03.31 | 공유 딥링크 플랫폼별 동작 분기 (iOS/Android), 카카오톡 URL 중복 표시 수정 |
| v1.6.3 | 2026.03.31 | 세로모드 전체화면 자동 오픈 버그 근본 수정, currentSheetIndex -1, 찬양목록 악보 미리보기 좌우 탐색 |
| v1.6.1 | 2026.03.31 | 가로모드 분할뷰 복원, 악보 미리보기 추가, 카드 그리드 4열/6열 반응형 |
| v1.6.0 | 2026.03.28 | 드래그 앤 드롭 순서 변경, 핀치 줌, 카드 3열 그리드, 공유 딥링크 자동 포함 |
| **v1.5.9** | **2026.03.27** | **가로 모드 관리자 링크 추가, 가로/세로 버튼 크기 최적화, 악보 있을 때 가로 전환 자동 분할뷰 (#40/#41/#42/#43)** |
| v1.5.8 | 2026.03.27 | 관리자 통계 BOTTOM 10 추가, 찬양 목록 빈도 정렬 버튼 추가, 전체 소스 문법 검수 |
| v1.5.7 | 2026.03.27 | 관리자 Google 로그인 버그 수정, 메인 푸터에 관리자 페이지 링크 추가 |
| v1.5.6 | 2026.03.26 | 성능 최적화 (지능형 프리페칭), 관리자 통계 대시보드(Chart.js), 반응형 UX 개선 |
| v1.5.5 | 2026.03.26 | 가로 모드 메타 정보 가독성 보정 및 최종 릴리즈 |
| v1.1.0 | 2026.03.25 | 관리자 대시보드 구축, 실시간 곡/가사 DB 마이그레이션, 공유/동기화 버그 수정 |
| v1.0.0 | 2026.03.24 | Digital Maestro 디자인 리뉴얼, 폰트(Manrope/Inter) 적용 |
| v0.5.x | 2026.03.23 | FCM 알림 개선 — 발송자 제외, 알림 클릭 시 자동 로드 |
| v0.4.x | 2026.03.20 | 버튼 UX 개편, 가사 서칭 추가, Firebase 익명 인증 |
| v0.3.x | 2026.03.15 | 전체화면 악보 뷰어 및 스와이프 제스처 도입 |
| v0.1.x | 2026.03.01 | Google Sheets 기반 초기 버전 |

---

## 🤝 기여 & 문의

버그 제보나 기능 아이디어는 [Issues](../../issues) 탭에 남겨주세요.
예배 현장에서 유용하게 사용되길 바랍니다. 🙌
