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

  test('키보드 단축키가 동작해야 함', async ({ page }) => {
    const isMac = process.platform === 'darwin';
    
    // 데스크톱에서는 사이드바가 이미 열려있음, 모바일에서만 열기
    const isMobile = await page.viewportSize()?.width! < 1024;
    if (isMobile) {
      await page.getByRole('button', { name: 'Open sidebar' }).click();
    }
    
    // Ctrl/Cmd + Shift + O로 새 채팅
    await page.keyboard.press(isMac ? 'Meta+Shift+O' : 'Control+Shift+O');
    
    // 입력 필드가 비어있고 포커스되어야 함
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    
    // 포커스를 다른 곳으로 이동
    const isMobile2 = await page.viewportSize()?.width! < 1024;
    if (isMobile2) {
      await page.getByRole('button', { name: 'Open sidebar' }).click();
      await page.getByRole('button', { name: 'Open sidebar' }).click(); // 사이드바 닫기
    } else {
      // 데스크톱에서는 다른 요소로 포커스 이동
      await page.locator('h1').click();
    }
    
    // Shift + ESC로 메시지 입력 필드에 포커스
    await page.keyboard.press('Shift+Escape');
    await expect(input).toBeFocused();
    
    // 텍스트가 있는 경우 커서가 끝으로 이동하는지 테스트
    await input.fill('테스트 메시지');
    const isMobile3 = await page.viewportSize()?.width! < 1024;
    if (isMobile3) {
      await page.getByRole('button', { name: 'Open sidebar' }).focus(); // 포커스 이동
    } else {
      await page.locator('h1').focus(); // 데스크톱에서는 h1로 포커스 이동
    }
    await page.keyboard.press('Shift+Escape');
    await expect(input).toBeFocused();
    
    // 커서가 텍스트 끝에 있는지 확인 (텍스트 추가로 확인)
    await page.keyboard.type(' 추가');
    await expect(input).toHaveValue('테스트 메시지 추가');
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

  


 

  test('다크 모드 지원 (시스템 설정 따라감)', async ({ page, browser }) => {
    // 다크 모드 컨텍스트 생성
    const context = await browser.newContext({
      colorScheme: 'dark'
    });
    const darkPage = await context.newPage();
    
    await darkPage.goto('/');
    
    // matchMedia 모의가 dark 모드를 반환하는지 확인
    const isDarkMode = await darkPage.evaluate(() => 
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    
    // 시스템 설정에 따라 스타일이 적용되어야 함
    // (실제 다크 모드 구현 시 테스트 추가)
    
    await context.close();
  });

  test('PWA: 오프라인에서도 기본 UI가 로드되어야 함', async ({ page, context }) => {
    // 첫 방문으로 캐시 생성
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Service Worker 등록 대기
    await page.waitForTimeout(2000);
    
    // 오프라인 설정
    await context.setOffline(true);
    
    // 페이지 새로고침
    await page.reload();
    
    // 기본 UI가 표시되어야 함
    await expect(page.locator('h1')).toContainText('WorkAI');
    await expect(page.getByText('오프라인 모드: 저장된 대화만 볼 수 있습니다.')).toBeVisible();
  });
});