import { test, expect, Page } from '@playwright/test';

const legalUser = { email: 'legal.user@example.com', password: 'password123' };

async function login(page: Page, user: { email: string, password: string }) {
  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
}

test.describe('Advanced Search Workflow', () => {

  test('user can search and see relevant results', async ({ page }) => {
    await login(page, legalUser);

    // Find the global search bar in the header and perform a search
    const searchInput = page.locator('header input[name="q"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('confidentiality term');
    await searchInput.press('Enter');

    // Verify navigation to the search results page
    await expect(page).toHaveURL(/.*\/search\?q=confidentiality%20term/);
    await expect(page.locator('h1:has-text("Search Results")')).toBeVisible();

    // Verify that expected content appears in the results
    // This assumes the indexing of sample data will find this contract and snippet
    const resultFilename = page.locator('h2:has-text("Master Services Agreement.pdf")');
    const resultSnippet = page.locator('blockquote:has-text("confidentiality term of 5 years")');
    await expect(resultFilename).toBeVisible();
    await expect(resultSnippet).toBeVisible();
  });
});