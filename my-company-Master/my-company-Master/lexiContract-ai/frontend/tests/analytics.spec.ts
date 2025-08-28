import { test, expect, request } from '@playwright/test';
import path from 'path';

test.describe('Advanced Analytics Dashboard', () => {
  const uniqueId = Date.now();
  const orgName = `AnalyticsCorp ${uniqueId}`;
  const adminEmail = `admin_analytics_${uniqueId}@lexicontract.ai`;
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

    // Upload contract to generate analytics data
    await page.setInputFiles('input[type="file"]', contractFixture);
    
    // Wait for analysis to complete so we have data to view
    await expect(page.getByText('test-contract.txt')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('completed')).toBeVisible({ timeout: 15000 });

    await page.close();
  });

  test('should display analytics dashboard with correct data', async ({ page }) => {
    // 1. Login as the admin user
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    // 2. Navigate to Analytics page
    await page.getByRole('link', { name: 'Analytics' }).click();
    await expect(page).toHaveURL('/analytics');

    // 3. Verify KPIs are displayed
    await expect(page.getByText('Total Contracts')).toBeVisible();
    await expect(page.locator('div', { hasText: 'Total Contracts' }).getByText('1')).toBeVisible();

    // 4. Verify charts are displayed
    await expect(page.getByText('Risk Distribution')).toBeVisible();
    await expect(page.getByText('Contract Volume Over Time')).toBeVisible();
  });
});