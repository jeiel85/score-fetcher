# Score Fetcher 작업 지침

## ⚠️ 필수 프로토콜: 소스 작업 전 체크리스트

**모든 소스 작업을 시작하기 전에 반드시 아래 순서를 따를 것:**

```
1. git fetch origin          # 원격 최신 상태 확인
2. git checkout main         # main 브랜치로 전환
3. git pull origin main      # ⚠️ 반드시 최신 소스 먼저 다운로드
4. git status                # 작업 전 상태 확인 (unstaged files 없어야 함)
```

> **이 절차는 선택이 아닌 필수입니다.** 사용자가 별도로 언급하지 않아도 세션 시작 시 반드시 실행합니다.

### 왜 이 절차가 중요한가?

- **중복 수정 방지**: 이미 main에 반영된 내용을 다시 브랜치에서 구현하는 낭비 방지
- **충돌 최소화**: 최신 기반에서 작업하면 리베이스/머지 충돌 감소
- **버전 불일치 방지**: 오래된 소스에서 작업하여 발생하는 실수 방지

---

## 📋 이슈 대응 작업 흐름

### 1단계: 이슈 분석
```
1. GitHub 이슈 목록 확인 (gh issue list --state open)
2. 이미 처리된 이슈인지 확인 (main에 포함되어 있는지 grep)
3. roadmap, monetization, security 라벨 제외
4. 즉시 대응 가능한 이슈 선별
```

### 2단계: 브랜치 생성
```bash
git pull origin main
git checkout -b feat/issue-{번호}-{간단설명}-YYYYMMDD
```

### 3단계: 구현
```
1. 관련 코드 파일 읽기 (기존 패턴 파악)
2. 구현
3. 문법 오류 없는지 확인
```

### 4단계: 커밋 & 푸시
```bash
git add .
git commit -m "feat: #{이슈번호} {간단 설명}"
git push -u origin {브랜치명}
```

### 5단계: PR 생성
```bash
gh pr create --title "feat: #{이슈번호} {설명}" --body "$(cat pr-body.md)"
```

### 6단계: 머지 후 이슈 닫기
```bash
gh pr merge {PR번호} --admin --merge
gh issue close {이슈번호}
```

---

## 🚫 제외 목록

아래 라벨/카테고리에 해당하는 이슈는 **즉시 대응하지 않음:**

| 라벨/카테고리 | 이유 |
|---------------|------|
| `roadmap` | 장기 로드맵 - 별도 기획 필요 |
| `monetization` | 수익화 - 사용자 요청으로 제외 |
| `security` | 보안 관련 - 전문 검토 필요 |

---

## 📁 파일 구조

```
score-fetcher/
├── WORKFLOW.md              # 본 파일 - 작업 지침
├── CLAUDE.md               # 프로젝트 개요 및 코드 규칙
├── ROADMAP.md              # 개발 로드맵
├── README.md               # 프로젝트 소개 (GitHub 표시용)
├── source_history.md       # 개발 마일스톤 이력
├── index.html              # 메인 앱
├── admin.html              # 관리자 대시보드
├── manifest.json           # PWA 설정
├── style.css               # 스타일
├── js/
│   ├── firebase.js         # Firebase 초기화
│   ├── utils.js            # 유틸리티 (버전 상수 포함)
│   ├── history.js          # 콘티 이력
│   ├── song-list.js        # 찬양 목록
│   ├── sheet-viewer.js     # 악보 뷰어
│   ├── push.js             # FCM 푸시
│   ├── share.js            # 공유
│   └── notifications.js    # 알림센터
└── functions/
    └── index.js            # Cloud Functions (FCM 발송)
```

---

## ✅ 완료 체크리스트

커밋 전에 반드시 확인:
- [ ] 최신 main에서 브랜치 생성했는가?
- [ ] 기존 코드 패턴을 따랐는가?
- [ ] 버전 업이 필요한가? (CLAUDE.md 버전 관리 규칙 참고)

---

## 🔢 버전 관리 규칙

버전 업 시 5곳 동시 수정 (CLAUDE.md 상세 규칙 참고):
1. `js/utils.js` — `APP_VERSION`, `BUILD_DATE`
2. `index.html` — `const VERSION`
3. `index.html` — `.app-version-badge` 텍스트
4. `README.md` — 배지, 변경이력
5. `CLAUDE.md` — 현재 상태 테이블

---

*최종 업데이트: 2026-04-21*
