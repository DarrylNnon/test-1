import { test, expect, request } from '@playwright/test';
import path from 'path';

test.describe('Enhanced Search Functionality', () => {
  const uniqueId = Date.now();
  const orgName = `SearchCorp ${uniqueId}`;
  const adminEmail = `admin_search_${uniqueId}@lexicontract.ai`;
  const adminPassword = 'aSecurePassword123';
  const contractFixture = path.resolve(__dirname, 'fixtures/test-contract.txt');

  test.beforeAll(async ({ browser, request: apiRequest }) => {
    // Register Admin
    const page = await browser.newPage();
    await page.goto('/register');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByPlaceholder('Organization Name').fill(orgName);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/login');

    // Login and get token
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');
    const token = await page.evaluate(() => document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]);

    // Activate subscription for uploads
    await apiRequest.patch('/api/v1/testing/update-subscription', {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'active' },
    });

    // Upload contract
    await page.setInputFiles('input[type="file"]', contractFixture);
    
    // Wait for analysis to complete
    await expect(page.getByText('test-contract.txt')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('completed')).toBeVisible({ timeout: 15000 });

    await page.close();
  });

  test('should return search results with highlighted snippets', async ({ page }) => {
    // 1. Login as the admin user
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    // 2. Perform a search from the header
    const searchQuery = 'confidentiality';
    await page.getByPlaceholder('Search contracts...').fill(searchQuery);
    await page.getByPlaceholder('Search contracts...').press('Enter');

    // 3. Verify navigation and results
    await expect(page).toHaveURL(`/search?query=${searchQuery}`);
    await expect(page.getByRole('heading', { name: `Search Results for "${searchQuery}"` })).toBeVisible();

    // 4. Verify the contract and snippet are displayed correctly
    const resultBlock = page.locator('div', { hasText: 'test-contract.txt' });
    await expect(resultBlock).toBeVisible();
    
    const snippet = resultBlock.locator('p', { has: page.locator('strong') });
    await expect(snippet).toBeVisible();
    await expect(snippet).toContainText('The');
    await expect(snippet.locator('strong')).toHaveText(searchQuery);
    await expect(snippet).toContainText('term of 5 years is a key part');
  });
});