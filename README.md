# 🎵 찬양 악보 매니저
### Praise Sheet Music Manager

> **콘티 입력부터 악보 검색, 전체화면 뷰어, 실시간 이력 공유, 푸시 알림까지 — 찬양팀 리더를 위한 스마트 워크플로우 도구**

[![배포](https://img.shields.io/badge/배포-score--fetcher.vercel.app-000?style=flat-square&logo=vercel&logoColor=white)](https://score-fetcher.vercel.app/)
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
- **새 콘티 자동 알림** — 콘티 저장 시 등록된 모든 팀원 기기에 푸시 알림 발송
- **알림 내용** — 제목: `🎶 콘티제목`, 본문: 번호 있는 곡 줄 최대 4개 요약
- **Firebase Cloud Functions** — 서버리스 함수로 알림 처리 (서울 리전, `asia-northeast3`)
- **만료 토큰 자동 정리** — 발송 실패한 토큰을 DB에서 자동 제거
- **포그라운드 알림** — 앱이 열린 상태에서도 화면 상단에 토스트 메시지 표시

### 📖 전체 곡 목록 검색
- **691곡 내장** — `hymn_list.txt` 기반의 전체 곡 검색 모달
- **실시간 필터** — 번호 또는 제목으로 즉시 검색
- **클릭으로 추가** — 곡을 클릭하면 입력창에 바로 추가

### 💡 화면 꺼짐 방지
- **Wake Lock API** — 앱 사용 중 화면 자동 꺼짐 항상 차단 (별도 버튼 없음, 자동 활성)
- **자동 재획득** — 탭 복귀 시 Wake Lock 자동 재요청

### 📱 PWA 지원
- **홈 화면 추가** — 스마트폰 홈 화면에 앱 아이콘으로 설치 가능
- **스탠드얼론 모드** — 브라우저 UI 없이 앱처럼 실행

### 🔗 링크 미리보기 (Open Graph)
- 카카오톡, 슬랙, 디스코드 등에서 링크 공유 시 미리보기 카드 표시
- `og-image.svg` — 1200×630 전용 OG 이미지 내장

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
├── index.html              # 메인 앱 (스타일·로직 포함 단일 파일)
├── manifest.json           # PWA 설정
├── firebase-messaging-sw.js  # FCM 서비스 워커 (푸시 알림 수신)
├── hymn_list.txt           # 찬양 곡 목록 (691곡)
├── icon.png                # 앱 아이콘
├── og-image.svg            # 링크 공유 미리보기 이미지 (1200×630)
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

### 4. Firebase Cloud Functions 배포 (푸시 알림)

```bash
npm install -g firebase-tools
firebase login
firebase use YOUR_PROJECT_ID
cd functions && npm install
firebase deploy --only functions
```

### 5. Vercel 배포

```bash
# Vercel CLI 사용
npx vercel --prod

# 또는 GitHub 저장소와 Vercel 연동 후 자동 배포
```

---

## 🔄 변경 이력

| 버전 | 내용 |
|------|------|
| v4.0 | 버튼 이름·위치 개편, Wake Lock 항상 ON, 공유 시 자동 저장, 푸시 알림 곡 목록 요약, 이력 팝업 차단 |
| v3.0 | 전체화면 악보 뷰어 추가 (스와이프·버튼 네비게이션), FCM 푸시 알림, Cloud Functions 연동, 콘티 공유 이미지 |
| v2.1 | 지난 콘티 클릭 시 내용 불러오기, Open Graph 링크 미리보기, GitHub 푸터 |
| v2.0 | Firebase 연동, Wake Lock, 전체 곡 목록 모달 |
| v1.x | Google Sheets 기반 초기 버전 |

---

## 🤝 기여 & 문의

버그 제보나 기능 아이디어는 [Issues](../../issues) 탭에 남겨주세요.
예배 현장에서 유용하게 사용되길 바랍니다. 🙌
