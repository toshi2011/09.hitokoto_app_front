import { test, expect } from '@playwright/test';

test('投稿すると画像カードが出現', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox').fill('テスト投稿');
  await page.getByRole('button', { name: '投稿' }).click();
  // alt属性で検証
  const img = page.getByAltText(/テスト投稿/);
  await expect(img).toBeVisible();
}); 