import { test, expect } from '@playwright/test';

test.describe('Google Drive Import Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the login API call and navigate to the dashboard
    await page.route('**/api/v1/auth/token', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'fake-test-token', token_type: 'bearer' }),
      });
    });
    await page.route('**/api/v1/users/me', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'user-123',
                email: 'test@example.com',
                organization: { id: 'org-123', name: 'Test Corp', plan_id: 'enterprise' }
            }),
        });
    });
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard/contracts');
  });

  test('should allow a user to import a file from Google Drive', async ({ page }) => {
    // Mock the API calls for the file picker
    await page.route('**/api/v1/integrations/google-drive/files**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          files: [
            { id: 'file-1', name: 'Test_Contract_Alpha.pdf', mimeType: 'application/pdf', modifiedTime: new Date().toISOString() },
            { id: 'file-2', name: 'Vendor_Agreement_Beta.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', modifiedTime: new Date().toISOString() },
          ],
          nextPageToken: null,
        }),
      });
    });

    // Mock the import API call
    await page.route('**/api/v1/integrations/google-drive/import', async route => {
        expect(route.request().method()).toBe('POST');
        const postData = route.request().postDataJSON();
        expect(postData.file_id).toBe('file-1');
        expect(postData.file_name).toBe('Test_Contract_Alpha.pdf');
        await route.fulfill({
            status: 202, // Accepted
            contentType: 'application/json',
            body: JSON.stringify({ id: 'new-contract-123', filename: 'Test_Contract_Alpha.pdf' }),
        });
    });

    const contractsPromise = page.waitForResponse('**/api/v1/contracts/');
    
    await page.click('button:has-text("Import from Google Drive")');
    await expect(page.locator('h3:has-text("Import from Google Drive")')).toBeVisible();
    await expect(page.locator('text=Test_Contract_Alpha.pdf')).toBeVisible();

    await page.click('text=Test_Contract_Alpha.pdf');
    await expect(page.locator('li:has-text("Test_Contract_Alpha.pdf")')).toHaveClass(/bg-indigo-100/);

    await page.click('button:has-text("Import Selected File")');
    await contractsPromise;
    await expect(page.locator('h3:has-text("Import from Google Drive")')).not.toBeVisible();
  });
});