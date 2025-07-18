import { test, expect } from '@playwright/test';

test.describe('에러 처리 및 재시도', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('스트리밍 중 ESC 키로 취소할 수 있어야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // 메시지 전송
    await input.fill('긴 응답 테스트');
    await page.keyboard.press('Enter');
    
    // 스트리밍 시작 확인
    await expect(page.getByText('응답 생성 중...')).toBeVisible();
    
    // 일부 콘텐츠가 표시되기를 기다림
    await page.waitForTimeout(1000);
    
    // ESC로 취소 표시 확인
    await expect(page.getByText(/ESC로 취소/)).toBeVisible();
    
    // ESC 키로 취소
    await page.keyboard.press('Escape');
    
    // 스트리밍이 중단되었는지 확인
    await expect(page.getByText('응답 생성 중...')).not.toBeVisible();
  });

  test('네트워크 오류 시 에러 메시지가 표시되어야 함', async ({ page, context }) => {
    // 네트워크 오류 시뮬레이션
    await context.route('**/v1/chat/completions', route => {
      route.abort('failed');
    });
    
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // 메시지 전송
    await input.fill('네트워크 오류 테스트');
    await page.keyboard.press('Enter');
    
    // 에러 메시지 표시 확인
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText('오류가 발생했습니다')).toBeVisible();
    await expect(page.getByText('다시 시도')).toBeVisible();
  });

  test('재시도 기능이 동작해야 함', async ({ page, context }) => {
    let attemptCount = 0;
    
    // 첫 번째 시도는 실패, 두 번째는 성공
    await context.route('**/v1/chat/completions', route => {
      attemptCount++;
      if (attemptCount === 1) {
        route.abort('failed');
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'success',
            object: 'chat.completion',
            created: Date.now(),
            model: 'gpt-3.5-turbo',
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: '재시도 성공!',
                contentType: 'text'
              },
              finish_reason: 'stop'
            }]
          })
        });
      }
    });
    
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // 메시지 전송
    await input.fill('재시도 테스트');
    await page.keyboard.press('Enter');
    
    // 에러 발생
    await expect(page.getByRole('alert')).toBeVisible();
    
    // 재시도 버튼 클릭
    await page.getByText('다시 시도').click();
    
    // 재시도 성공
    await expect(page.getByText('재시도 성공!')).toBeVisible();
    await expect(page.getByRole('alert')).not.toBeVisible();
  });

  test('메시지 편집 및 재전송이 동작해야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // 첫 메시지 전송
    await input.fill('원본 메시지');
    await page.keyboard.press('Enter');
    
    // AI 응답 대기 (일반적인 텍스트 응답이 나올 때까지 대기)
    await expect(page.locator('[data-message-type="ai"]')).toBeVisible({ timeout: 10000 });
    
    // 메시지 편집 버튼 클릭
    await page.getByText('편집').click();
    
    // 메시지 수정
    const editTextarea = page.locator('textarea').first();
    await editTextarea.clear();
    await editTextarea.fill('수정된 메시지');
    
    // 전송
    await page.getByText('보내기').click();
    
    // 수정된 메시지가 표시되고 새로운 응답이 생성되어야 함
    await expect(page.getByText('수정된 메시지')).toBeVisible();
    await expect(page.locator('[data-message-type="user"]:has-text("원본 메시지")')).not.toBeVisible();
  });

  test('AI 응답 재생성이 동작해야 함', async ({ page }) => {
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // 메시지 전송
    await input.fill('재생성 테스트');
    await page.keyboard.press('Enter');
    
    // 첫 번째 AI 응답 대기
    const firstResponse = page.locator('text=/테스트 응답/').first();
    await expect(firstResponse).toBeVisible({ timeout: 10000 });
    
    // 재생성 버튼 클릭
    await page.hover(firstResponse.locator('..').locator('..'));
    await page.getByRole('button', { name: '응답 재생성' }).click();
    
    // 새로운 응답이 생성되는지 확인
    await expect(page.getByText('응답 생성 중...')).toBeVisible();
    await expect(page.getByText('응답 생성 중...')).not.toBeVisible({ timeout: 10000 });
  });

  test('오프라인 상태에서 적절한 안내가 표시되어야 함', async ({ page, context }) => {
    // 오프라인 상태 시뮬레이션
    await context.setOffline(true);
    
    // 오프라인 인디케이터 확인
    await expect(page.getByText('오프라인 모드: 저장된 대화만 볼 수 있습니다.')).toBeVisible();
    
    // 입력 필드가 비활성화되어야 함
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    await expect(input).toBeDisabled();
    
    // 온라인 상태로 복귀
    await context.setOffline(false);
    
    // 인디케이터가 사라지고 입력이 활성화되어야 함
    await expect(page.getByText('오프라인 모드: 저장된 대화만 볼 수 있습니다.')).not.toBeVisible();
    await expect(input).not.toBeDisabled();
  });

  



  test('접근성: 에러 메시지가 스크린 리더에 전달되어야 함', async ({ page, context }) => {
    // 네트워크 오류 시뮬레이션
    await context.route('**/v1/chat/completions', route => {
      route.abort('failed');
    });
    
    const input = page.getByPlaceholder('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    
    // 메시지 전송
    await input.fill('접근성 테스트');
    await page.keyboard.press('Enter');
    
    // 에러 메시지가 alert role을 가져야 함
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('오류가 발생했습니다');
    
    // 재시도 버튼이 포커스 가능해야 함
    const retryButton = page.getByText('다시 시도');
    await expect(retryButton).toBeVisible();
    await retryButton.focus();
    await expect(retryButton).toBeFocused();
  });
});