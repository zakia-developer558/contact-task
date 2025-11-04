import { test, expect } from '@playwright/test';

test('Contacts page Reset All shows toast', async ({ page }) => {
  await page.goto('/contacts');

  const resetAllButton = page.getByRole('button', { name: /reset all/i });
  await expect(resetAllButton).toBeVisible();
  await resetAllButton.click();
  await expect(page.getByText(/preferences cleared/i)).toBeVisible();
});
