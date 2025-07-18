import { test, expect } from '@playwright/test';

test.describe('고급 기능 및 접근성', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('채팅 히스토리 기능이 동작해야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // 첫 번째 대화
    await input.fill('첫 번째 대화 메시지');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-message-type="ai"]')).toBeVisible({ timeout: 10000 });
    
    // 데스크톱에서는 사이드바가 이미 열려있음, 모바일에서만 열기
    // const isMobile = await page.viewportSize()?.width! < 1024;
    // if (isMobile) {
    //   const menuButton = page.getByRole('button', { name: 'Open sidebar' });
    //   await menuButton.click();
    // }
    
    // 첫 번째 대화가 완료되면 자동으로 저장됨 - 사이드바에서 확인
    // 저장된 세션이 나타날 때까지 대기
    await expect(page.locator('.lg\\:block [data-chat-session]')).toHaveCount(1, { timeout: 5000 });
    
    // 새 채팅 시작
    await page.getByRole('button', { name: '새 채팅' }).first().click();
    
    // 새 대화
    await input.fill('두 번째 대화 메시지');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-message-type="ai"]')).toBeVisible({ timeout: 10000 });

    // 두 번째 대화가 완료되면 자동으로 저장됨 - 사이드바에서 확인
    // 저장된 세션이 2개가 될 때까지 대기
    await expect(page.locator('.lg\\:block [data-chat-session]')).toHaveCount(2, { timeout: 5000 });
    
    // 첫 번째 세션 클릭하여 로드 (최신 것이 첫 번째에 위치하므로 두 번째 것이 첫 번째 대화)
    const chatSessions = page.locator('.lg\\:block [data-chat-session]');
    await chatSessions.nth(1).click();
    
    // 메시지가 복원되어야 함
    await expect(page.getByText('첫 번째 대화 메시지')).toBeVisible();
  });

  test('채팅 검색 기능이 동작해야 함 (Ctrl/Cmd + K)', async ({ page }) => {
    const isMac = process.platform === 'darwin';
    
    // 여러 대화 생성
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    await input.fill('React 관련 질문');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // 데스크톱에서는 사이드바가 이미 열려있음, 모바일에서만 열기
    const isMobile = await page.viewportSize()?.width! < 1024;
    if (isMobile) {
      await page.getByRole('button', { name: 'Open sidebar' }).click();
    }
    
    // 첫 번째 대화 완료 후 저장 대기
    await page.waitForTimeout(1000);
    
    // 새 채팅
    await page.getByRole('button', { name: '새 채팅' }).first().click();
    await input.fill('TypeScript 질문');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-message-type="ai"]')).toBeVisible({ timeout: 10000 });
    
    // 두 번째 대화 완료 후 저장 대기
    await page.waitForTimeout(1000);
    
    // Ctrl/Cmd + K로 검색창 포커스
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');
    
    const searchInput = page.getByPlaceholder(/대화 검색/).first();
    await expect(searchInput).toBeFocused();
    
    // 검색
    await searchInput.fill('React');
    
    // React 대화만 표시되어야 함 (채팅 세션 확인)
    const visibleSessions = page.locator('[data-chat-session]:visible');
    await expect(visibleSessions).toHaveCount(1);
    await expect(visibleSessions).toContainText('React 관련');
  });

  test('채팅 세션 내보내기가 동작해야 함', async ({ page }) => {
    // 대화 생성
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    await input.fill('내보내기 테스트 메시지');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-message-type="ai"]')).toBeVisible({ timeout: 10000 });
    
    // 대화 완료 후 저장 대기
    await page.waitForTimeout(1000);
    
    // 데스크톱에서는 사이드바가 이미 열려있음, 모바일에서만 열기
    const isMobile = await page.viewportSize()?.width! < 1024;
    if (isMobile) {
      await page.getByRole('button', { name: 'Open sidebar' }).click();
    }
    
    // 세션 호버하여 액션 버튼 표시
    const session = page.locator('[data-chat-session]').first();
    await session.hover();
    
    // JSON 내보내기 테스트
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'JSON으로 내보내기' }).click()
    ]);
    
    // 파일명 확인
    expect(download.suggestedFilename()).toMatch(/chat_.*\.json/);
    
    // Markdown 내보내기 테스트
    await session.hover();
    const [mdDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Markdown으로 내보내기' }).click()
    ]);
    
    expect(mdDownload.suggestedFilename()).toMatch(/chat_.*\.md/);
  });


  test('접근성: 키보드 네비게이션이 동작해야 함', async ({ page }) => {
    // Tab 키로 주요 요소 탐색
    await page.keyboard.press('Tab'); // Skip navigation
    await page.keyboard.press('Tab'); // 메뉴 버튼
    await page.keyboard.press('Tab'); // 새 채팅 버튼
    
    // 메시지 입력 필드로 이동
    let focused = await page.evaluate(() => document.activeElement?.getAttribute('placeholder'));
    while (focused !== '메시지를 입력하세요... (Shift+Enter로 줄바꿈)') {
      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => document.activeElement?.getAttribute('placeholder'));
    }
    
    // 메시지 입력 및 전송
    await page.keyboard.type('키보드 접근성 테스트');
    await page.keyboard.press('Enter');
    
    // 응답 대기
    await expect(page.locator('[data-message-type="ai"]')).toBeVisible({ timeout: 10000 });
  });

  


 

  test('다크 모드 지원 (토글 버튼으로 전환)', async ({ page }) => {
    // 초기 상태는 라이트 모드
    const initialClasses = await page.evaluate(() => document.documentElement.className);
    expect(initialClasses).not.toContain('dark');
    
    // 다크 모드 토글 버튼 찾기 (해/달 아이콘)
    const darkModeToggle = page.getByRole('button', { name: /Switch to dark mode/i });
    await expect(darkModeToggle).toBeVisible();
    
    // 다크 모드로 전환
    await darkModeToggle.click();
    
    // HTML에 dark 클래스가 적용되었는지 확인
    const darkClasses = await page.evaluate(() => document.documentElement.className);
    expect(darkClasses).toContain('dark');
    
    // 다크 모드 배경색이 적용되었는지 확인
    const darkBackground = page.locator('.dark\\:bg-gray-900');
    await expect(darkBackground.first()).toBeVisible();
    
    // 토글 버튼 아이콘이 변경되었는지 확인 (라이트 모드로 전환 버튼)
    const lightModeToggle = page.getByRole('button', { name: /Switch to light mode/i });
    await expect(lightModeToggle).toBeVisible();
    
    // 라이트 모드로 다시 전환
    await lightModeToggle.click();
    
    // dark 클래스가 제거되었는지 확인
    const lightClasses = await page.evaluate(() => document.documentElement.className);
    expect(lightClasses).not.toContain('dark');
    
    // localStorage에 설정이 저장되었는지 확인
    const savedTheme = await page.evaluate(() => localStorage.getItem('darkMode'));
    expect(savedTheme).toBe('false');
  });

});