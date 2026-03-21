# score-fetcher 프로젝트

## 프로젝트 개요
교회 예배 콘티(악보 세트리스트)를 관리하고, 악보 이미지를 자동으로 불러오는 단일 페이지 앱입니다.

## 주요 파일
- `index.html` — 앱 전체 (HTML + CSS + JS 단일 파일)
- `hymn_list.txt` — 찬양 목록 (번호 + 제목)
- `images/` — 악보 이미지 (001.png ~ ...)

## Firebase 구조
- Realtime Database URL: `https://score-fetcher-db-default-rtdb.firebaseio.com`
- `/history` — 콘티 이력 저장 (POST: 저장, DELETE /{key}: 삭제)
- `/fcm_tokens` — FCM 푸시 토큰 목록

## 주요 기능
- 찬양 번호 입력 → 악보 이미지 자동 표시
- 콘티 저장 → Firebase `/history`에 기록
- 콘티 이력 모달 → 불러오기(탭) / 삭제(길게 누르기, 700ms)
- 화면 꺼짐 방지 (Wake Lock API)
- FCM 푸시 알림

## 개발 브랜치
- 작업 브랜치: `claude/project-analysis-briefing-k7yQF`
- 원격: `origin` (jeiel85/score-fetcher)

## 코드 규칙
- 단일 HTML 파일 유지 (별도 JS/CSS 파일 분리 없음)
- Firebase REST API 직접 호출 (SDK DB 미사용, FCM만 SDK 사용)
- 모바일 터치 우선 UX
