## Summary
- #145: 인접 악보 프리로드 (prefetchImage) 추가 - 천천히 스와이프 시 다음 악보 위치에 현재 악보가 보이는 현상 방지
- #144: requestAnimationFrame으로 깜빡임 방어 - 스와이프 완료 후 화면이 잠깐 깜빡이는 현상 수정
- #143: navigateSheet에서 유효성 검사 추가 - 첫/마지막 페이지에서 스와이프 시 악보가 화면 밖으로 밀려나는 현상 수정
- Landscape 뷰어에도 동일 로직 적용
- Playwright E2E 테스트 셋업 (버그 수정 후 자동 검증 가능)

## Testing
- Playwright 테스트 6개 모두 통과
- npm test / npm run test:headed / npm run test:ui로 테스트 실행 가능
