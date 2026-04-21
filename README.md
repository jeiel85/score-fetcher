# 🎵 콘티 메이커 (Conti Maker)
### Premium Praise Setlist & Sheet Music Manager

> **콘티 입력부터 악보 검색, 전체화면 뷰어, 실시간 이력 공유, 푸시 알림까지 — 찬양팀 리더를 위한 스마트 워크플로우 도구**

[![배포](https://img.shields.io/badge/배포-score--fetcher.vercel.app-000?style=flat-square&logo=vercel&logoColor=white)](https://score-fetcher.vercel.app/)
[![관리자](https://img.shields.io/badge/관리자-admin.html-indigo?style=flat-square&logo=google-cloud&logoColor=white)](https://score-fetcher.vercel.app/admin.html)
![Version](https://img.shields.io/badge/version-v1.13.2-blue?style=flat-square)
![Build](https://img.shields.io/badge/build-2026.04.21-indigo?style=flat-square)
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
- **693곡 악보 이미지** 내장 + 새찬송가 645곡 별도 탭 지원 (찬NNN 프리픽스)

### 🖼 전체화면 악보 뷰어
- **전체화면 모드** — 악보 카드 클릭 시 전체화면 뷰어로 전환
- **리얼타임 스와이프** — 손 따라 악보가 실시간으로 이동, 이전/다음 악보 슬라이드 애니메이션
- **핀치 줌** — 1~4x 확대/축소, 확대 중 패닝, 더블탭으로 리셋
- **악보 프리로딩** — 현재 악보 표시 즉시 인접 악보를 백그라운드 프리로드
- **UI 오버레이 자동 숨김** — 헤더/푸터가 3초 후 자동 페이드아웃, 탭으로 토글
- **하단 스와이프 닫기** — 아래로 드래그하면 뷰어 종료

### 📱 세로/가로 모드 자동 전환
- **세로 모드** — 악보 카드 3열 그리드로 전체 순서 한눈에 파악
- **가로 모드** — 좌측 콘티 이미지 + 우측 악보 뷰어 2분할 레이아웃 자동 전환
- **회전 감지** — 세로→가로 시 분할뷰 자동 활성화, 가로→세로 시 카드 그리드 복원
- **드래그 앤 드롭** — ⠿ 핸들 터치로 카드 순서 변경, textarea 자동 동기화

### 📋 콘티함 (저장 & 불러오기)
- **Firebase Realtime Database** 연동으로 콘티를 즉시 저장·공유
- **콘티 복제** — "제목만 복사" 및 "전체 복제"로 반복 작업 단축 (#128)
- **콘티 수정 모드** — 저장된 콘티 불러온 후 내용 수정 및 덮어쓰기
- **이력 검색** — 전체 캐시 후 실시간 필터링
- **길게 누르기 삭제** — 700ms 길게 누르면 삭제 확인

### 🔔 FCM 푸시 알림 & 알림센터
- **새 콘티 자동 알림** — 저장 시 등록된 팀원 기기에 푸시 발송 (발신자 본인 제외)
- **포그라운드 알림** — 앱이 열린 상태에서도 시스템 알림으로 표시
- **알림 클릭 시 자동 로드** — 최신 콘티 불러오기 + 악보 만들기 자동 실행
- **알림센터** — 공지/신규곡/가사신고/콘티수정 4종 알림, 미읽음 배지, 전체 읽기

### 📖 찬양 목록 & 가사
- **CCM + 새찬송가 탭** — 690여 곡 + 645곡, 번호·제목·가사·태그 통합 검색
- **최근 사용 곡** — localStorage 기반, 검색창 상단 퀵 버튼(최대 10개) 제공 (#129)
- **가사 섹션 자동 구분** — [1절], [후렴], [브릿지] 태그 기반 레이블 자동 표시 (#135)
- **찬양 즐겨찾기** — ★/☆ 표시 및 필터 기능
- **가사 오류 신고** — 사용자 즉시 제보 → 관리자 대시보드 처리

### 🖼️ 콘티 공유
- **콘티 이미지 생성** — 어두운 단색 배경, 제목 해시 기반 팔레트, 날짜 액센트 컬러
- **딥링크 공유** — iOS: 이미지+링크 동시 공유, Android: 이미지 공유 + 클립보드 링크
- **공유 미리보기 모달** — 3초 후 푸터 자동 숨김, 탭으로 토글

### ⚙️ 관리자 & 시스템
- **Feature Toggle** — 신규 기능을 관리자 페이지에서 앱 재배포 없이 실시간 제어
- **관리자 모바일 최적화** — 테이블→카드 변환, 가로 스크롤 탭, 터치 최적화 (#150)
- **악보 업로드** — 전/후 비교 모달, 확장자 충돌 자동 처리, .jpeg→.jpg 정규화
- **강제 업데이트** — 버전 체크 기반 캐시 강제 갱신
- **PWA 지원** — 홈 화면 추가 설치, Shortcuts(콘티함/찬양목록 바로가기) 지원 (#137)
- **웹 접근성(A11y)** — 주요 버튼 aria-label, 악보 이미지 alt 텍스트 (#141)
- **Wake Lock** — 앱 사용 중 화면 꺼짐 항상 차단

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Database | Google Firebase Realtime Database |
| 서버리스 함수 | Firebase Cloud Functions v2 (Node.js) |
| 푸시 알림 | Firebase Cloud Messaging (FCM) |
| PWA | Web App Manifest, Service Worker |
| 추가 API | Screen Wake Lock API, Web Share API |
| 배포 | Vercel (GitHub push → 자동 배포) |

---

## 📁 프로젝트 구조

```
score-fetcher/
├── index.html              # 메인 앱
├── admin.html              # 관리자 대시보드
├── style.css               # 전체 스타일
├── manifest.json           # PWA 설정
├── firebase-messaging-sw.js  # FCM 서비스 워커
├── hymn_list.txt           # CCM 찬양 목록
├── hymn_list.json          # 새찬송가 목록 (645곡)
├── lyrics.json             # 가사 데이터 (553곡)
├── icon.png                # 앱 아이콘
├── js/
│   ├── firebase.js         # Firebase 초기화, 익명 인증
│   ├── utils.js            # 공통 유틸, 버전 관리
│   ├── history.js          # 콘티 저장/이력
│   ├── song-list.js        # 찬양 목록, 가사 모달
│   ├── sheet-viewer.js     # 악보 뷰어 (전체화면/가로/스와이프/핀치줌)
│   ├── push.js             # FCM 푸시 설정
│   ├── share.js            # 콘티 이미지 공유
│   └── notifications.js    # 알림센터
├── images/                 # 악보 이미지 (001.jpg ~ 693곡)
└── functions/              # Firebase Cloud Functions
    └── index.js            # 콘티 저장 트리거 → FCM 발송
```

---

## 📊 데이터 흐름

```
사용자 입력 (콘티 목록)
        ↓
Regex 정제 → 번호 표준화 (NNN 형식)
        ↓
이미지 탐색 (jpg → png → gif → jfif 순서)
        ↓
악보 카드 렌더링 (3열 그리드)
        ↓
[카드 클릭] → 전체화면 뷰어 (리얼타임 스와이프 / 핀치줌 / 자동 숨김 UI)

[저장 버튼]
        ↓
Firebase Realtime DB 저장
        ↓
Cloud Functions 트리거 → 팀원 전체 FCM 푸시 알림
```

---

## 🚀 설치 및 설정

### 1. Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. **Realtime Database** 활성화 → 익명 인증 활성화
3. **Cloud Messaging** 활성화 → 웹 푸시 인증서(VAPID 키) 발급

### 2. `firebase-config.js` 설정

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

### 4. Firebase Cloud Functions 배포

```bash
npm install -g firebase-tools
firebase login
cd functions && npm install
firebase deploy --only functions
```

### 5. Vercel 배포

GitHub 저장소와 Vercel 연동 후 `main` 브랜치 push 시 자동 배포.

---

## 🔄 변경 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| **v1.13.2** | **2026.04.21** | **Feature Toggle 시스템, 관리자 모바일 UX 최적화 (#150), URL 파라미터 기능 활성화** |
| v1.13.1 | 2026.04.15 | PWA Shortcuts/스크린샷 (#137), 접근성 강화 (#141), 악보 프리로드 개선, 뷰어 바운스 효과 |
| v1.13.0 | 2026.04.11 | 콘티 복제 (#128), 최근 사용 곡 퀵 메뉴 (#129), 가사 섹션 자동 구분 (#135) |
| v1.12.x | 2026.04.14 | 리얼타임 스와이프, 다음/이전 페이지 슬라이드 애니메이션, 깜빡임 수정 |
| v1.11.x | 2026.04.11 | 악보 카드 오버플로우 수정, 중복 저장 방지, 찬양목록 UX 개선 6건 |
| v1.10.0 | 2026.04.09 | 알림센터 전체 타입 구현, 콘티 수정 모드, admin 인라인 수정 |
| v1.9.0 | 2026.04.09 | 새찬송가 탭 추가 (645곡, 찬NNN 프리픽스) |
| v1.8.x | 2026.04.08 | 알림센터 신설, 악보 업로드 전/후 비교 모달 |
| v1.7.x | 2026.04.02~06 | 가로→세로 회전 분할뷰 자동 전환, 뷰어 UI 자동 숨김, 탭 토글 |
| v1.6.x | 2026.03.28~31 | 드래그앤드롭, 핀치줌, 카드 그리드, 딥링크 공유, 전체화면 자동 오픈 버그 수정 |
| v1.5.x | 2026.03.26~27 | 성능 최적화(프리페칭), 관리자 통계 대시보드, 가로 모드 자동 분할뷰 |
| v1.0.0 | 2026.03.24 | Digital Maestro 디자인 리뉴얼, Firebase 익명 인증, FCM 알림 |
| v0.x.x | 2026.03.01~ | 초기 버전 (Google Sheets 기반) |

---

## 🤝 기여 & 문의

버그 제보나 기능 아이디어는 [Issues](../../issues) 탭에 남겨주세요.
예배 현장에서 유용하게 사용되길 바랍니다. 🙌
