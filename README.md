# 🎵 찬양 악보 매니저
### Praise Sheet Music Manager

> **콘티 입력부터 악보 검색, 실시간 이력 공유까지 — 찬양팀 리더를 위한 스마트 워크플로우 도구**

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

### ⚡ 실시간 데이터베이스 (Firebase)
- **밀리초 단위 동기화** — Google Firebase Realtime Database로 콘티를 즉시 저장·공유
- **전체 공유** — 앱에 접속하는 모든 팀원이 동일한 이력을 실시간으로 확인

### 📋 지난 콘티 불러오기 _(v2.1 신규)_
- **원클릭 복원** — 이력 목록에서 지난 콘티를 클릭하면 제목과 곡 목록이 입력창에 바로 채워짐
- **무한 스크롤** — 이력을 20개씩 불러오고, 스크롤로 더 불러오기 지원
- **타임스탬프 표시** — 저장된 날짜와 시간을 이력 카드에 함께 표시

### 🔐 스마트 보안 & 인증
- **권한 분리** — Auth Key를 아는 관리자만 서버에 저장 가능 (팀원은 다운로드 전용)
- **자동 로그인** — `localStorage`에 비밀번호를 기억하여 최초 1회 입력 후 자동 인증
- **유연한 스킵** — 비밀번호 취소 시 저장을 건너뛰고 악보 다운로드만 수행

### 🔍 지능형 텍스트 정제 (Regex)
- **포맷 자동 변환** — `1. 제목`, `05.제목`, ` 685 . 제목 ` 등 어떤 형식이든 `001 제목`으로 자동 정규화
- **데이터 일관성** — 규격화된 포맷으로 DB에 누적되어 사후 관리가 용이

### 💾 모바일 최적화 UX
- **역순 저장** — 모바일 갤러리 특성상 마지막 저장 이미지가 상단에 오는 점을 고려한 역순 다운로드
- **화면 꺼짐 방지** — 연주/콘티 확인 중 `Wake Lock API`로 화면 자동 꺼짐 차단 (토글 가능)
- **맨 위로 버튼** — 악보 리스트가 길어질 때 빠르게 상단으로 이동

### 📖 전체 곡 목록 검색
- **691곡 내장** — `hymn_list.txt` 기반의 전체 곡 검색 모달
- **실시간 필터** — 번호 또는 제목으로 즉시 검색 및 클릭으로 입력창에 추가

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Database | Google Firebase Realtime Database |
| 로컬 저장소 | 브라우저 LocalStorage |
| 배포 | Vercel |
| 추가 API | Screen Wake Lock API, Blob Download API |

---

## 🚀 설치 및 설정

### 1. Firebase 설정
```
1. Firebase Console에서 Realtime Database 생성 (테스트 모드로 시작)
2. DB 최상단에 auth_key 노드를 만들고 원하는 비밀번호 입력
3. Rules 탭에서 .write 권한을 auth_key 값과 비교하도록 설정
```

### 2. 소스 코드 수정
```js
// index.html 내 상단 상수 수정
const FIREBASE_URL = "https://YOUR-PROJECT.firebaseio.com/history.json";
```

### 3. 악보 이미지 업로드
```
images/ 폴더에 곡 번호와 일치하는 파일 업로드
예시: 001.jpg, 022.png, 685.gif
지원 포맷: .jpg .png .gif .jfif
```

---

## 📊 데이터 흐름

```
사용자 입력 (콘티 목록)
        ↓
Regex 정제 → 번호 표준화 (NNN 형식)
        ↓
이미지 검색 (jpg → png → gif → jfif 순서로 시도)
        ↓
악보 카드 렌더링
        ↓
[다운로드 버튼 클릭]
        ↓
Firebase 저장 (관리자) + Blob 순차 다운로드
```

---

## 📁 프로젝트 구조

```
score-fetcher/
├── index.html        # 메인 앱 (스타일·로직 포함 단일 파일)
├── manifest.json     # PWA 설정
├── hymn_list.txt     # 찬양 곡 목록 (689곡)
├── icon.png          # 앱 아이콘
└── images/           # 악보 이미지 (001.png, 002.jpg, ...)
```

---

## 📝 코드 주석 가이드

모든 주요 함수에는 다음 형식의 주석이 포함되어 있습니다:

```js
/**
 * [함수명]
 * Input  : 입력 값 설명
 * Output : 반환 값 설명
 * Why    : 이렇게 구현한 이유 (단순 "무엇을"이 아닌 "왜"에 집중)
 */
```

---

## 🔄 변경 이력

| 버전 | 내용 |
|------|------|
| v2.1 | 지난 콘티 클릭 시 내용 불러오기 기능 추가 |
| v2.0 | Firebase 연동, Wake Lock, 역순 다운로드, 곡 목록 모달 |
| v1.x | Google Sheets 기반 초기 버전 |

---

## 🤝 기여 & 문의

버그 제보나 기능 아이디어는 [Issues](../../issues) 탭에 남겨주세요.
예배 현장에서 유용하게 사용되길 바랍니다. 🙌
