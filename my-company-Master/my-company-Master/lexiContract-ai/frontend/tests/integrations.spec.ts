import { test, expect, request } from '@playwright/test';

test.describe('Integration Management Flow', () => {
  const uniqueId = Date.now();
  const orgName = `IntegrationCorp ${uniqueId}`;
  const adminEmail = `admin_integration_${uniqueId}@lexicontract.ai`;
  const adminPassword = 'aSecurePassword123';

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

    // Activate subscription
    await apiRequest.patch('/api/v1/testing/update-subscription', {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'active' },
    });

    await page.close();
  });

  test('Admin should be able to connect and disconnect an integration', async ({ page }) => {
    // 1. Login as admin
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    // 2. Navigate to Settings > Integrations
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('link', { name: 'Integrations' }).click();
    await expect(page).toHaveURL('/settings/integrations');

    // 3. Connect to Salesforce
    const salesforceRow = page.locator('li', { hasText: 'Salesforce' });
    await salesforceRow.getByRole('button', { name: 'Connect' }).click();

    // 4. Fill in credentials in the modal and submit
    await expect(page.getByRole('heading', { name: 'Connect to Salesforce' })).toBeVisible();
    await page.getByLabel('API Key').fill('fake-salesforce-api-key');
    await page.getByRole('button', { name: 'Connect' }).click();

    // 5. Verify the integration is now connected
    await expect(salesforceRow.getByRole('button', { name: 'Disconnect' })).toBeVisible();

    // 6. Disconnect the integration
    page.on('dialog', dialog => dialog.accept()); // Auto-accept confirm dialog
    await salesforceRow.getByRole('button', { name: 'Disconnect' }).click();

    // 7. Verify the integration is now disconnected
    await expect(salesforceRow.getByRole('button', { name: 'Connect' })).toBeVisible();
  });
});