import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Interactive Highlighting Flow', () => {
  const uniqueId = Date.now();
  const userEmail = `highlighter_${uniqueId}@lexicontract.ai`;
  const userPassword = 'aSecurePassword123';
  const organizationName = `HighlightCorp ${uniqueId}`;
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

  test('should highlight text in document when hovering over a suggestion card', async ({ page }) => {
    // --- Login ---
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(userPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    // --- Upload Contract ---
    await page.setInputFiles('input[type="file"]', contractFixture);
    await page.getByRole('button', { name: 'Upload & Analyze' }).click();

    // --- Wait for analysis and navigate to details ---
    const contractRow = page.getByRole('row', { name: /test-contract.txt/i });
    await expect(contractRow.getByText('Completed')).toBeVisible({ timeout: 10000 });
    await contractRow.click();

    // --- Identify the suggestion card and the corresponding text highlight ---
    const suggestionCard = page.locator('div', { hasText: 'The typical confidentiality term is 2-3 years.' });
    const highlightedText = page.locator('mark', { hasText: 'confidentiality term of 5 years' });

    await expect(suggestionCard).toBeVisible();
    await expect(highlightedText).toBeVisible();

    // --- Verify initial state (no special hover highlight) ---
    // The `ring-2` class is what we use for the active hover highlight.
    await expect(highlightedText).not.toHaveClass(/ring-2/);

    // --- Hover over the suggestion card ---
    await suggestionCard.hover();

    // --- Verify the text is now highlighted with a ring ---
    await expect(highlightedText).toHaveClass(/ring-2/);

    // --- Move the mouse away from the card ---
    // Moving to another element, like the main heading, will trigger onMouseLeave
    await page.getByRole('heading', { name: /test-contract.txt/i }).hover();

    // --- Verify the highlight ring is removed ---
    await expect(highlightedText).not.toHaveClass(/ring-2/);
  });
});