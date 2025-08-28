import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('User Commenting Flow', () => {
  const uniqueId = Date.now();
  const userEmail = `commenter_${uniqueId}@lexicontract.ai`;
  const userPassword = 'aSecurePassword123';
  const organizationName = `CommentCorp ${uniqueId}`;
  const contractFixture = path.resolve(__dirname, 'fixtures/test-contract.txt');

  test.beforeAll(async ({ browser }) => {
    // Register a new user for the test suite
    const page = await browser.newPage();
    await page.goto('/register');
    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(userPassword);
    await page.getByPlaceholder('Organization Name').fill(organizationName);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/login');
    await page.close();
  });

  test('should allow a user to select text, add a comment, and see it persist', async ({ page }) => {
    // --- Login & Upload ---
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(userPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');
    await page.setInputFiles('input[type="file"]', contractFixture);
    await page.getByRole('button', { name: 'Upload & Analyze' }).click();

    // --- Navigate to contract ---
    const contractRow = page.getByRole('row', { name: /test-contract.txt/i });
    await expect(contractRow.getByText('Completed')).toBeVisible({ timeout: 10000 });
    await contractRow.click();
    await expect(page.getByRole('heading', { name: /test-contract.txt/i })).toBeVisible();

    // --- Select text to trigger popover ---
    const textToSelect = 'standard Non-Disclosure Agreement';
    const textContainer = page.locator('div.prose > pre');
    await expect(textContainer).toContainText(textToSelect);

    // Use page.evaluate to create a precise text selection and trigger the mouseup event
    await page.evaluate((text) => {
      const pre = document.querySelector('div.prose > pre');
      if (pre && pre.firstChild) {
        const fullText = pre.textContent || '';
        const startIndex = fullText.indexOf(text);
        if (startIndex === -1) return;

        const range = document.createRange();
        const selection = window.getSelection();
        range.setStart(pre.firstChild, startIndex);
        range.setEnd(pre.firstChild, startIndex + text.length);
        selection?.removeAllRanges();
        selection?.addRange(range);
        pre.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      }
    }, textToSelect);

    // --- Add a comment via the popover ---
    const popover = page.locator('div.absolute.z-10');
    await expect(popover).toBeVisible();
    const commentText = 'This needs clarification from the legal team.';
    await popover.getByPlaceholder('Add a comment...').fill(commentText);
    await popover.getByRole('button', { name: 'Save' }).click();

    // --- Verify UI update and persistence ---
    await expect(popover).not.toBeVisible();
    const commentCard = page.locator('div', { hasText: 'User Comments' }).locator('div', { hasText: commentText });
    await expect(commentCard).toBeVisible();
    const highlightedComment = page.locator('mark', { hasText: textToSelect });
    await expect(highlightedComment).toHaveClass(/bg-blue-200/);

    await page.reload();
    await expect(commentCard).toBeVisible();
    await expect(highlightedComment).toBeVisible();
  });
});