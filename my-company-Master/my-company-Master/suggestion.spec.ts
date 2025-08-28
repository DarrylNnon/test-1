import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Interactive Suggestion Flow', () => {
  const uniqueId = Date.now();
  const userEmail = `suggester_${uniqueId}@lexicontract.ai`;
  const userPassword = 'aSecurePassword123';
  const organizationName = `SuggestionCorp ${uniqueId}`;
  const contractFixture = path.resolve(__dirname, 'e2e/fixtures/test-contract.txt');

  test.beforeAll(async ({ browser }) => {
    // --- Register a new user once for all tests in this file ---
    const page = await browser.newPage();
    await page.goto('/register');
    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(userPassword);
    await page.getByPlaceholder('Organization Name').fill(organizationName);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/login');
    await page.close();
  });

  test('should allow a user to accept an AI suggestion', async ({ page }) => {
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

    // --- Find a specific suggestion card ---
    // We target the card by the unique comment text from our mock analyzer.
    const suggestionCard = page.locator('div', { hasText: 'The typical confidentiality term is 2-3 years.' });
    await expect(suggestionCard).toBeVisible();

    // --- Verify initial state ---
    // The status label should be 'Suggested'
    await expect(suggestionCard.getByText('Suggested')).toBeVisible();
    const acceptButton = suggestionCard.getByRole('button', { name: 'Accept' });
    const rejectButton = suggestionCard.getByRole('button', { name: 'Reject' });
    await expect(acceptButton).toBeEnabled();
    await expect(rejectButton).toBeEnabled();

    // --- Accept the suggestion ---
    await acceptButton.click();

    // --- Verify UI update ---
    // The status label should now be 'Accepted'
    await expect(suggestionCard.getByText('Accepted')).toBeVisible();
    // The buttons should disappear (or become disabled)
    await expect(acceptButton).not.toBeVisible();
    await expect(rejectButton).not.toBeVisible();

    // --- Reload the page to verify persistence ---
    await page.reload();

    // --- Verify persisted state ---
    const persistedCard = page.locator('div', { hasText: 'The typical confidentiality term is 2-3 years.' });
    await expect(persistedCard).toBeVisible();
    await expect(persistedCard.getByText('Accepted')).toBeVisible();
    await expect(persistedCard.getByRole('button', { name: 'Accept' })).not.toBeVisible();
  });
});