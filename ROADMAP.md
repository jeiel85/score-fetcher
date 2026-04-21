# 콘티 메이커 — 로드맵

> 최신 배포: [score-fetcher.vercel.app](https://score-fetcher.vercel.app/)
> 이슈 트래커: [GitHub Issues](https://github.com/jeiel85/score-fetcher/issues)

---

## 현재 버전: v1.13.2 (2026-04-21)

| 기능 | 상태 |
|------|------|
| 웹 PWA (Vercel 배포) | ✅ 운영 중 |
| 콘티 저장 / 불러오기 (Firebase) | ✅ 운영 중 |
| FCM 푸시 알림 (Cloud Function) | ✅ 운영 중 |
| 알림센터 (4종 타입) | ✅ 완료 (v1.8.0~v1.10.0) |
| 콘티 URL 딥링크 공유 | ✅ 완료 (#54) |
| 찬양 즐겨찾기 | ✅ 완료 (#55) |
| 악보 핀치 줌 | ✅ 완료 (#53) |
| 콘티 카드 드래그 순서 변경 | ✅ 완료 (#56) |
| 리얼타임 스와이프 + 슬라이드 애니메이션 | ✅ 완료 (v1.11.5~v1.12.x) |
| 새찬송가 탭 (645곡) | ✅ 완료 (v1.9.0) |
| 콘티 복제 / 수정 모드 | ✅ 완료 (#128, v1.13.0) |
| 최근 사용 곡 퀵 메뉴 | ✅ 완료 (#129, v1.13.0) |
| 가사 섹션 자동 구분 | ✅ 완료 (#135, v1.13.0) |
| PWA Shortcuts + 스크린샷 | ✅ 완료 (#137, v1.13.1) |
| 웹 접근성(A11y) 강화 | ✅ 완료 (#141, v1.13.1) |
| Feature Toggle 시스템 | ✅ 완료 (v1.13.2) |
| 관리자 모바일 UX 최적화 | ✅ 완료 (#150, v1.13.2) |

---

## 로드맵 (보류 중)

> GitHub에서 확인: [label: roadmap](https://github.com/jeiel85/score-fetcher/issues?q=label%3Aroadmap)

| # | 제목 | 분류 | 메모 |
|---|------|------|------|
| #58 | 예배 당일 알림 예약 | FCM | Cloud Functions cron 작업 필요 |
| #57 | 악보 멀티페이지 지원 | 콘텐츠 | admin.html 동반 수정 필요 |
| #49 | Capacitor Android 앱 포팅 | 네이티브 | 최종 목표, 개발 환경 세팅 필요 |

---

## 버전 관리 정책

| 구분 | 조건 | 예시 |
|------|------|------|
| **PATCH** | 버그 수정, 소규모 CSS 개선 | v1.13.1 → v1.13.2 |
| **MINOR** | 새 기능 추가 | v1.12.x → v1.13.0 |
| **MAJOR** | 대규모 리팩토링 / 구조 변경 | v1.x → v2.0 |

- PR 커밋 메시지에 버전 태그 포함
- MINOR 이상에서 GitHub Release 태그 생성
- 버전 5곳 동시 수정: `js/utils.js`, `index.html`(VERSION 상수 + 배지), `README.md`
