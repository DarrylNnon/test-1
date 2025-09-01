import { test, expect, Page } from '@playwright/test';

const legalUser = { email: 'legal.user@example.com', password: 'password123' };

// A contract that the user has access to
const contractId = 'c1a2b3d4-e5f6-a1b2-c3d4-e5f6a1b2c3d4'; 

async function login(page: Page, user: { email: string, password: string }) {
  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
}

test.describe('AI Clause Generation Workflow', () => {

  test('user can generate and insert a clause using a slash command', async ({ page }) => {
    await login(page, legalUser);
    await page.goto(`/contracts/${contractId}`);

    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();

    // Type the slash command to trigger the menu
    await editor.focus();
    await editor.type('/generate');

    // Click the "Generate Clause" command from the suggestion list
    const commandButton = page.locator('button:has-text("Generate Clause")');
    await expect(commandButton).toBeVisible();
    await commandButton.click();

    // The generation modal should now be open
    const modal = page.locator('div:has-text("Generate AI Clause")');
    await expect(modal).toBeVisible();

    const promptText = 'a standard confidentiality clause for a mutual NDA';
    await page.fill('textarea[placeholder="Enter your prompt here..."]', promptText);
    await page.click('button:has-text("Generate")');

    // The mock response should be inserted into the editor
    await expect(editor).toContainText(`This is a mock-generated clause in response to the prompt: '${promptText}'.`);
  });
});