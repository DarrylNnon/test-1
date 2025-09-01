import { test, expect, Page } from '@playwright/test';

const legalUser = { email: 'legal.user@example.com', password: 'password123' };
const salesUser = { email: 'sales.user@example.com', password: 'password123' };

// A contract that both users have access to for collaboration
const collaborativeContractId = 'c1a2b3d4-e5f6-a1b2-c3d4-e5f6a1b2c3d4'; 

async function login(page: Page, user: { email: string, password: string }) {
  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
}

test.describe('Real-time Collaborative Editor Workflow', () => {

  test('users should see each other\'s edits in real-time', async ({ browser }) => {
    // Create two separate browser contexts for two users
    const user1Context = await browser.newContext();
    const user2Context = await browser.newContext();
    const page1 = await user1Context.newPage();
    const page2 = await user2Context.newPage();

    // User 1 (Legal) logs in and navigates to the contract
    await login(page1, legalUser);
    await page1.goto(`/contracts/${collaborativeContractId}`);
    
    // User 2 (Sales) logs in and navigates to the same contract
    await login(page2, salesUser);
    await page2.goto(`/contracts/${collaborativeContractId}`);

    // Locate the TipTap editor for both users
    const editor1 = page1.locator('.ProseMirror');
    const editor2 = page2.locator('.ProseMirror');

    // Wait for both editors to be visible
    await expect(editor1).toBeVisible();
    await expect(editor2).toBeVisible();

    // Clear any existing text to start fresh
    await editor1.focus();
    await page1.keyboard.press('Control+A');
    await page1.keyboard.press('Delete');

    // Wait for the deletion to sync across to user 2
    await expect(editor2).toHaveText('');

    // --- Test User 1 typing and User 2 seeing it ---
    const textFromUser1 = 'Hello from the legal team. This clause needs review.';
    await editor1.type(textFromUser1);

    // Assert that User 2 sees the text typed by User 1
    await expect(editor2).toContainText(textFromUser1);

    // Assert that User 2 sees User 1's cursor and name
    await expect(page2.locator('.collaboration-cursor__caret')).toBeVisible();
    await expect(page2.locator('.collaboration-cursor__label')).toContainText(legalUser.email);

    // --- Test User 2 typing and User 1 seeing it ---
    const textFromUser2 = ' Agreed, adding a comment now.';
    await editor2.type(textFromUser2);

    // Assert that User 1 sees the combined text
    await expect(editor1).toContainText(textFromUser1 + textFromUser2);
    
    // Cleanup
    await user1Context.close();
    await user2Context.close();
  });
});