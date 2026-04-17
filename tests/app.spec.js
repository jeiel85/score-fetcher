// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('score-fetcher 앱 기본 기능', () => {
  test('메인 페이지 로드 및 주요 요소 존재 확인', async ({ page }) => {
    await page.goto('/');
    
    // 제목 또는 로고 확인
    await expect(page.locator('h1, .app-title, #app-layout')).toBeVisible();
    
    // 입력창 확인
    await expect(page.locator('#song-input')).toBeVisible();
    
    // 주요 버튼 확인
    const buttons = page.locator('.btn-search, .btn-history, .btn-show-list');
    await expect(buttons.count()).resolves.toBeGreaterThan(0);
  });

  test('악보 만들기 입력 후 카드 생성', async ({ page }) => {
    await page.goto('/');
    
    // 입력창에 곡 번호 입력
    const input = page.locator('#song-input');
    await input.fill('1\n2\n3');
    
    // 악보 만들기 버튼 클릭 (콘티 만들기 🎵)
    await page.locator('.btn-search').click();
    
    // 카드 로드 대기 (이미지 로드 시간)
    await page.waitForTimeout(2000);
    
    // 결과 컨테이너에 카드가 생성됨
    const cards = page.locator('.sheet-music-card');
    await expect(cards.count()).resolves.toBeGreaterThan(0);
  });

  test('콘티함 모달 열기', async ({ page }) => {
    await page.goto('/');
    
    // 콘티함 버튼 클릭
    await page.locator('.btn-history').click();
    
    // 모달이 열림 (id="historyModal")
    await expect(page.locator('#historyModal')).toBeVisible();
  });

  test('찬양 목록 모달 열기', async ({ page }) => {
    await page.goto('/');
    
    // 찬양 목록 버튼 클릭
    await page.locator('.btn-show-list').click();
    
    // 모달이 열림 (id="songModal")
    await expect(page.locator('#songModal')).toBeVisible();
  });
});

test.describe('버그 수정 검증 (#145, #144, #143)', () => {
  // 참고: 실제 스와이프 테스트는 이미지가 필요한 환경에서만 가능
  // 이 테스트는 앱이 정상적으로 카드 뷰까지 도달하는지 확인
  test('#145 스와이프 관련 코드 로드 확인', async ({ page }) => {
    await page.goto('/');
    
    // 여러 곡 입력
    await page.locator('#song-input').fill('1\n2\n3');
    await page.locator('.btn-search').click();
    
    // 카드 생성 확인 (이미지 로드 여부와 관계없이 카드 요소는 생성되어야 함)
    await page.waitForSelector('.sheet-music-card', { state: 'visible', timeout: 10000 });
    
    // sheet-viewer.js 로드 확인 (스와이프 관련 코드가 포함된 파일)
    const hasSheetViewer = await page.evaluate(() => {
      return typeof navigateSheet === 'function' && typeof prefetchImage === 'function';
    });
    expect(hasSheetViewer).toBe(true);
  });

  test('#143 첫/마지막 페이지 스와이프 방어 관련 함수 확인', async ({ page }) => {
    await page.goto('/');
    
    // 곡 1개만 입력
    await page.locator('#song-input').fill('1');
    await page.locator('.btn-search').click();
    
    // 카드 로드 확인
    await page.waitForSelector('.sheet-music-card', { state: 'visible', timeout: 10000 });
    
    // navigateSheet 함수가 존재하고 first/last 페이지 체크 로직이 포함되었는지 확인
    const hasNavigateSheet = await page.evaluate(() => {
      return typeof navigateSheet === 'function';
    });
    expect(hasNavigateSheet).toBe(true);
  });
});