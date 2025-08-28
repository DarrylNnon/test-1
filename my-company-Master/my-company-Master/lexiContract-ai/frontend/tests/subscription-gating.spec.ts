import { test, expect, request } from '@playwright/test';

test.describe('Subscription Gating', () => {
  const uniqueId = Date.now();
  const orgName = `GatedCorp ${uniqueId}`;

  test('should block features for users without an active subscription', async ({ page }) => {
    const userEmail = `nosub_${uniqueId}@lexicontract.ai`;
    const userPassword = 'aSecurePassword123';

    // 1. Register and login
    await page.goto('/register');
    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(userPassword);
    await page.getByPlaceholder('Organization Name').fill(orgName);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/login');

    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(userPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    // 2. Verify UI gating on the dashboard
    await expect(page.getByRole('heading', { name: 'Subscription Inactive' })).toBeVisible();
    await expect(page.getByText('You cannot upload new contracts.')).toBeVisible();
    const uploadButton = page.getByLabel('Upload Contract');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toHaveClass(/cursor-not-allowed/);
    await expect(uploadButton).toBeDisabled();

    // 3. Verify API gating
    const token = await page.evaluate(() => document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]);
    expect(token).toBeDefined();

    const apiContext = await request.newContext();
    const fileContent = 'This is a test contract.';
    
    const uploadResponse = await apiContext.post('http://localhost:8000/api/v1/contracts/upload', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: { name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from(fileContent) },
      },
    });

    // Assert that the API returns a 403 Forbidden error
    expect(uploadResponse.status()).toBe(403);
    const responseJson = await uploadResponse.json();
    expect(responseJson.detail).toBe('This feature requires an active subscription. Please upgrade your plan.');
  });

  test('should enable features for users with an active subscription', async ({ page }) => {
    const userEmail = `sub_${uniqueId}@lexicontract.ai`;
    const userPassword = 'aSecurePassword123';

    // 1. Register and login
    await page.goto('/register');
    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(userPassword);
    await page.getByPlaceholder('Organization Name').fill(orgName);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/login');

    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(userPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    // 2. Manually activate subscription via testing endpoint
    const token = await page.evaluate(() => document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]);
    expect(token).toBeDefined();

    const apiContext = await request.newContext();
    const updateSubResponse = await apiContext.patch('http://localhost:8000/api/v1/testing/update-subscription', {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'active' },
    });
    expect(updateSubResponse.ok()).toBeTruthy();

    // 3. Reload the page and verify UI is now ungated
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Subscription Inactive' })).not.toBeVisible();
    const uploadButton = page.getByLabel('Upload Contract');
    await expect(uploadButton).not.toHaveClass(/cursor-not-allowed/);
    await expect(uploadButton).toBeEnabled();

    // 4. Verify file upload now works via UI
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'contract.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('This is a test contract for an active user.'),
    });

    // Assert that the new contract appears in the list
    await expect(page.getByText('contract.pdf')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('pending')).toBeVisible();
  });
});