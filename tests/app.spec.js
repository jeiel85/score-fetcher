// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('score-fetcher 앱 기본 기능', () => {
  test('메인 페이지 로드 및 주요 요소 존재 확인', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1, .app-title, #app-layout')).toBeVisible();
    await expect(page.locator('#song-input')).toBeVisible();
    const buttons = page.locator('.btn-search, .btn-history, .btn-show-list');
    await expect(buttons.count()).resolves.toBeGreaterThan(0);
  });

  test('콘티함 모달 열기', async ({ page }) => {
    await page.goto('/');
    await page.locator('.btn-history').click();
    await expect(page.locator('#historyModal')).toBeVisible();
  });

  test('찬양 목록 모달 열기', async ({ page }) => {
    await page.goto('/');
    await page.locator('.btn-show-list').click();
    await expect(page.locator('#songModal')).toBeVisible();
  });
});