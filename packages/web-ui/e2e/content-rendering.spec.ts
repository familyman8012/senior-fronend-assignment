import { test, expect } from '@playwright/test';

test.describe('콘텐츠 타입별 렌더링', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Markdown 콘텐츠가 올바르게 렌더링되어야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // Markdown 요청
    await input.fill('markdown 예시를 보여주세요');
    await page.keyboard.press('Enter');
    
    // Markdown 렌더링 확인
    await expect(page.locator('h1').filter({ hasText: '마크다운 예시' })).toBeVisible({ timeout: 10000 });
    
    // 리스트 렌더링 확인
    await expect(page.locator('ul li').filter({ hasText: '리스트 항목' })).toBeVisible();
    
    // 코드 블록 확인
    await expect(page.locator('pre code')).toBeVisible();
    await expect(page.locator('pre code')).toContainText('console.log');
    
    // 굵은 글씨 확인
    await expect(page.locator('strong')).toContainText('굵은 글씨');
  });

  test('HTML 콘텐츠가 안전하게 렌더링되어야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // HTML 요청
    await input.fill('html 태그 예시를 주세요');
    await page.keyboard.press('Enter');
    
    // HTML 렌더링 확인
    await expect(page.locator('h3').filter({ hasText: 'HTML 예시' })).toBeVisible({ timeout: 10000 });
    
    // 안전한 HTML 렌더링 확인
    await expect(page.locator('p strong')).toContainText('HTML');
    
    // 링크가 새 탭에서 열리도록 설정되었는지 확인
    const links = page.locator('.html-content a');
    const linkCount = await links.count();
    for (let i = 0; i < linkCount; i++) {
      await expect(links.nth(i)).toHaveAttribute('target', '_blank');
      await expect(links.nth(i)).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  test('JSON 콘텐츠가 구조화되어 표시되어야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // JSON 요청
    await input.fill('json 형태로 데이터를 주세요');
    await page.keyboard.press('Enter');
    
    // JSON 뷰어 확인
    await expect(page.getByText('JSON 데이터')).toBeVisible({ timeout: 10000 });
    
    // 트리 뷰가 기본으로 표시되어야 함
    await expect(page.getByRole('button', { name: '트리 뷰' })).toHaveAttribute('aria-pressed', 'true');
    
    // JSON 속성 확인
    await expect(page.locator('text=/"name"/')).toBeVisible();
    await expect(page.locator('text=/"테스트"/')).toBeVisible();
    
    // 원본 뷰로 전환
    await page.getByRole('button', { name: '원본' }).click();
    
    // 구문 강조가 적용된 JSON 확인
    await expect(page.locator('[data-testid="syntax-highlighter"]')).toBeVisible();
    
    // 복사 기능 테스트
    await page.getByRole('button', { name: 'JSON 데이터 클립보드에 복사' }).click();
    await expect(page.getByText('복사됨!')).toBeVisible();
  });

  test('일반 텍스트가 올바르게 표시되어야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // 일반 텍스트 요청
    await input.fill('안녕하세요');
    await page.keyboard.press('Enter');
    
    // 텍스트 응답 확인
    await expect(page.getByText(/테스트 응답입니다/)).toBeVisible({ timeout: 10000 });
    
    // 특수 포맷팅이 없어야 함
    const messageContent = page.locator('.text-content').last();
    await expect(messageContent.locator('h1, h2, h3, pre, code')).toHaveCount(0);
  });

  test('스트리밍 중 콘텐츠가 점진적으로 표시되어야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // Markdown 스트리밍 테스트
    await input.fill('markdown 스트리밍 테스트');
    await page.keyboard.press('Enter');
    
    // 스트리밍 인디케이터 확인
    await expect(page.getByText('응답 생성 중...')).toBeVisible();
    
    // 타이핑 애니메이션 확인
    await expect(page.locator('.animate-typing')).toBeVisible();
    
    // 콘텐츠가 점진적으로 나타나는지 확인 (일부만 표시되었다가 전체가 표시됨)
    await page.waitForTimeout(500);
    const partialContent = await page.locator('.markdown-content').last().textContent();
    
    await page.waitForTimeout(1000);
    const fullContent = await page.locator('.markdown-content').last().textContent();
    
    expect(fullContent!.length).toBeGreaterThan(partialContent!.length);
  });

  test('JSON 트리 뷰에서 객체/배열 접기/펼치기가 동작해야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // JSON 요청
    await input.fill('json 데이터를 보여주세요');
    await page.keyboard.press('Enter');
    
    // JSON 응답 대기
    await expect(page.getByText('JSON 데이터')).toBeVisible({ timeout: 10000 });
    
    // 배열 접기/펼치기 버튼 찾기
    const toggleButton = page.locator('button[aria-label*="배열"]').first();
    
    // 초기 상태 - 펼쳐져 있음
    await expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    
    // 접기
    await toggleButton.click();
    await expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('text=/\\.\\.\\.\\(\\d+개 항목\\)/')).toBeVisible();
    
    // 다시 펼치기
    await toggleButton.click();
    await expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  test('URL이 클릭 가능한 링크로 변환되어야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // URL이 포함된 메시지 전송
    await input.fill('웹사이트 https://example.com 을 확인하세요');
    await page.keyboard.press('Enter');
    
    // 응답에서 URL이 링크로 변환되었는지 확인
    const link = page.locator('a[href="https://example.com"]');
    await expect(link).toBeVisible({ timeout: 10000 });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('다양한 콘텐츠 타입이 연속으로 렌더링되어야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // Markdown
    await input.fill('markdown 예시');
    await page.keyboard.press('Enter');
    await page.waitForSelector('h1:has-text("마크다운 예시")');
    
    // HTML
    await input.fill('html 예시');
    await page.keyboard.press('Enter');
    await page.waitForSelector('h3:has-text("HTML 예시")');
    
    // JSON
    await input.fill('json 예시');
    await page.keyboard.press('Enter');
    await page.waitForSelector('text="JSON 데이터"');
    
    // 모든 콘텐츠가 올바른 순서로 표시되어야 함
    const messages = page.locator('[data-testid="content-renderer"]');
    await expect(messages).toHaveCount(6); // 3개의 사용자 메시지 + 3개의 AI 응답
  });

  test('콘텐츠 타입에 따라 적절한 배경 스타일이 적용되어야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // Markdown
    await input.fill('markdown 스타일 테스트');
    await page.keyboard.press('Enter');
    
    // Markdown 메시지의 배경 스타일 확인
    await page.waitForSelector('.markdown-content');
    const markdownContainer = page.locator('.markdown-content').last().locator('..');
    await expect(markdownContainer).toHaveClass(/bg-white\/50/);
    
    // JSON
    await input.fill('json 스타일 테스트');
    await page.keyboard.press('Enter');
    
    // JSON 메시지는 배경 스타일이 없어야 함
    await page.waitForSelector('.json-content');
    const jsonContainer = page.locator('.json-content').last().locator('..');
    await expect(jsonContainer).not.toHaveClass(/bg-white\/50/);
  });
});