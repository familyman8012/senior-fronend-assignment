import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display initial UI elements', async ({ page }) => {
    // Check header
    await expect(page.locator('h1')).toContainText('AI Chat Interface');
    
    // Check empty state
    await expect(page.locator('text=채팅을 시작해보세요')).toBeVisible();
    
    // Check input area
    await expect(page.locator('textarea[placeholder*="메시지를 입력하세요"]')).toBeVisible();
    await expect(page.locator('button[aria-label="메시지 전송"]')).toBeVisible();
  });

  test('should send and display messages', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="메시지를 입력하세요"]');
    const sendButton = page.locator('button[aria-label="메시지 전송"]');
    
    // Send a message
    await messageInput.fill('안녕하세요');
    await sendButton.click();
    
    // Check user message appears
    await expect(page.locator('text=안녕하세요').first()).toBeVisible();
    
    // Wait for AI response
    await expect(page.locator('.bg-chat-ai')).toBeVisible({ timeout: 10000 });
    
    // Input should be cleared
    await expect(messageInput).toHaveValue('');
  });

  test('should handle markdown content', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="메시지를 입력하세요"]');
    const sendButton = page.locator('button[aria-label="메시지 전송"]');
    
    await messageInput.fill('markdown 예시를 보여주세요');
    await sendButton.click();
    
    // Wait for response
    await page.waitForSelector('.markdown-content', { timeout: 10000 });
    
    // Check for markdown elements
    const markdownContent = page.locator('.markdown-content');
    await expect(markdownContent.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('should handle HTML content', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="메시지를 입력하세요"]');
    const sendButton = page.locator('button[aria-label="메시지 전송"]');
    
    await messageInput.fill('html 태그 예시를 주세요');
    await sendButton.click();
    
    // Wait for response
    await page.waitForSelector('.html-content', { timeout: 10000 });
    
    // HTML content should be rendered
    const htmlContent = page.locator('.html-content');
    await expect(htmlContent).toBeVisible();
  });

  test('should handle JSON content', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="메시지를 입력하세요"]');
    const sendButton = page.locator('button[aria-label="메시지 전송"]');
    
    await messageInput.fill('json 형태로 데이터를 주세요');
    await sendButton.click();
    
    // Wait for response
    await page.waitForSelector('.json-content', { timeout: 10000 });
    
    // Check for JSON viewer elements
    await expect(page.locator('text=JSON 데이터')).toBeVisible();
    await expect(page.locator('button:has-text("트리 뷰")')).toBeVisible();
    await expect(page.locator('button:has-text("원본")')).toBeVisible();
  });

  test('should show streaming indicator', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="메시지를 입력하세요"]');
    const sendButton = page.locator('button[aria-label="메시지 전송"]');
    
    await messageInput.fill('안녕하세요');
    await sendButton.click();
    
    // Check streaming indicator appears
    await expect(page.locator('text=응답 생성 중...')).toBeVisible();
    
    // Streaming indicator should disappear after response
    await expect(page.locator('text=응답 생성 중...')).toBeHidden({ timeout: 10000 });
  });

  test('should allow message editing', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="메시지를 입력하세요"]');
    const sendButton = page.locator('button[aria-label="메시지 전송"]');
    
    // Send a message
    await messageInput.fill('첫 번째 메시지');
    await sendButton.click();
    
    // Wait for response
    await page.waitForSelector('.bg-chat-ai', { timeout: 10000 });
    
    // Click edit on user message
    await page.locator('button:has-text("편집")').first().click();
    
    // Edit the message
    const editTextarea = page.locator('textarea').nth(1);
    await editTextarea.fill('수정된 메시지');
    await page.locator('button:has-text("저장")').click();
    
    // Check message was updated
    await expect(page.locator('text=수정된 메시지')).toBeVisible();
  });

  test('should allow response regeneration', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="메시지를 입력하세요"]');
    const sendButton = page.locator('button[aria-label="메시지 전송"]');
    
    // Send a message
    await messageInput.fill('안녕하세요');
    await sendButton.click();
    
    // Wait for response
    await page.waitForSelector('.bg-chat-ai', { timeout: 10000 });
    
    // Click regenerate
    await page.locator('button:has-text("재생성")').first().click();
    
    // New response should be generated
    await expect(page.locator('text=응답 생성 중...')).toBeVisible();
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="메시지를 입력하세요"]');
    
    await messageInput.fill('테스트 메시지');
    
    // Press Enter to send (without Shift)
    await messageInput.press('Enter');
    
    // Message should be sent
    await expect(page.locator('text=테스트 메시지').first()).toBeVisible();
    
    // Test Shift+Enter for new line
    await messageInput.fill('첫 번째 줄');
    await messageInput.press('Shift+Enter');
    await messageInput.type('두 번째 줄');
    
    // Textarea should contain multiline text
    await expect(messageInput).toHaveValue('첫 번째 줄\n두 번째 줄');
  });

  test('should persist chat history', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="메시지를 입력하세요"]');
    const sendButton = page.locator('button[aria-label="메시지 전송"]');
    
    // Send a message
    await messageInput.fill('영속성 테스트');
    await sendButton.click();
    
    // Wait for response
    await page.waitForSelector('.bg-chat-ai', { timeout: 10000 });
    
    // Reload page
    await page.reload();
    
    // Messages should still be visible
    await expect(page.locator('text=영속성 테스트')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    const messageInput = page.locator('textarea[placeholder*="메시지를 입력하세요"]');
    const sendButton = page.locator('button[aria-label="메시지 전송"]');
    
    await messageInput.fill('오프라인 테스트');
    await sendButton.click();
    
    // Error message should appear
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 5000 });
    
    // Re-enable network
    await page.context().setOffline(false);
  });
});