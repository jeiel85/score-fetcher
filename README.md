<div align="center">
  <img src="icon.png" width="100" height="100" alt="Conti Maker Logo" />
  <h1>🎵 Conti Maker (Score Fetcher)</h1>
  <p><strong>Premium Praise Setlist & Sheet Music Manager</strong></p>

  <p>
    <a href="https://score-fetcher.vercel.app/"><img src="https://img.shields.io/badge/Live-Demo-000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" /></a>
    <a href="https://score-fetcher.vercel.app/admin.html"><img src="https://img.shields.io/badge/Admin-Access-indigo?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Admin" /></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/version-v1.13.5-blue?style=flat-square" alt="Version" />
    <img src="https://img.shields.io/badge/build-2026.04.22-indigo?style=flat-square" alt="Build" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
  </p>
</div>

---

### 🌟 핵심 가치 (Core Value)
흩어져 있는 찬양 악보를 **곡 번호 하나로 즉시 검색**하고, 팀원 모두와 **실시간으로 콘티를 공유**하세요. 
예배 현장의 실제 불편함을 해결하기 위해 만들어진 스마트 워크플로우 도구입니다.

---

### 🚀 주요 기능 (Key Features)

<table border="0">
  <tr>
    <td width="50%">
      <h4>🔍 지능형 악보 검색</h4>
      <ul>
        <li>번호/제목 표준화 자동 정제 (Regex)</li>
        <li>이미지 확장자 다중 탐색 지원</li>
        <li>693곡 기본 내장 + 새찬송가 탭</li>
      </ul>
    </td>
    <td width="50%">
      <h4>🖼 전체화면 뷰어 (UX)</h4>
      <ul>
        <li>리얼타임 스와이프 & 슬라이드 애니메이션</li>
        <li>핀치 줌 (1~4x) 및 패닝 지원</li>
        <li>UI 오버레이 3초 자동 숨김 로직</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h4>📋 스마트 콘티함</h4>
      <ul>
        <li>Firebase 실시간 저장 및 복제 (#128)</li>
        <li>최근 사용 곡 퀵 버튼 메뉴 제공 (#129)</li>
        <li>가사 섹션 자동 구분 시각화 (#135)</li>
      </ul>
    </td>
    <td width="50%">
      <h4>🔔 푸시 알림 & PWA</h4>
      <ul>
        <li>새 콘티 등록 시 팀원 전체 FCM 알림</li>
        <li>오프라인 캐싱 지원 (0ms 로딩)</li>
        <li>Shortcuts & 홈 화면 설치 지원</li>
      </ul>
    </td>
  </tr>
</table>

---

### 🛠 기술 스택 (Tech Stack)

- **Frontend**: ![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=flat-square&logo=javascript&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
- **Backend**: ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black) (Auth, RTDB, Cloud Functions, FCM)
- **Deployment**: ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
- **Optimization**: PWA (Service Worker), Stale-While-Revalidate Caching

---

### 📂 프로젝트 구조 (Project Structure)

```text
score-fetcher/
├── index.html           # 메인 서비스 앱
├── admin.html           # 관리자 대시보드
├── style.css            # 글로벌 디자인 시스템
├── js/                  # 코어 로직 (Modular Vanilla JS)
├── functions/           # 서버리스 백엔드 (Node.js)
└── agents.md            # 📜 개발 지침 및 아키텍처 상세
```

---

### 🎯 로드맵 (Roadmap)

- [x] 리얼타임 스와이프 & 슬라이드 애니메이션
- [x] 관리자 모바일 UX 최적화 (#150)
- [ ] **Capacitor 기반 Android/iOS 하이브리드 앱 포팅**
- [ ] **예배 당일 알림 자동 예약 시스템**
- [ ] **악보 멀티페이지 레이아웃 지원**

---

### 🤝 기여 및 문의
버그 제보나 기능 제안은 [GitHub Issues](../../issues)를 통해 남겨주세요. 
작업 지침은 [agents.md](agents.md)를 참고하시기 바랍니다.

---
<div align="center">
  <p>© 2026 Conti Maker Team. All rights reserved.</p>
</div>
