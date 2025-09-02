import { test, expect } from '@playwright/test';

test.describe('Google Drive Import Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API response for connected integrations
    await page.route('**/api/v1/integrations/organization', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'some-uuid-gdrive',
            organization_id: 'org-uuid',
            is_enabled: true,
            integration: {
              id: 'gdrive-integration-uuid',
              name: 'Google Drive',
              category: 'Storage',
            },
          },
        ]),
      });
    });

    // Mock the API response for listing Google Drive files
    await page.route('**/api/v1/integrations/google-drive/files**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          files: [
            { id: 'gdrive-file-1', name: 'Master Service Agreement.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
            { id: 'gdrive-file-2', name: 'Vendor NDA.pdf', mimeType: 'application/pdf' },
          ],
          nextPageToken: null,
        }),
      });
    });

    // Mock the import API call
    await page.route('**/api/v1/integrations/google-drive/import', async (route) => {
      const newContractId = 'new-contract-from-gdrive-uuid';
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          id: newContractId,
          filename: 'Master Service Agreement.docx',
          analysis_status: 'pending',
        }),
      });
    });

    // Assume user is logged in and on the dashboard
    await page.goto('/dashboard');
  });

  test('should allow a user to import a file from Google Drive', async ({ page }) => {
    // This assumes a button structure for importing exists.
    await page.getByRole('button', { name: 'Import Contract' }).click();
    await page.getByRole('menuitem', { name: 'Import from Google Drive' }).click();

    await expect(page.getByRole('heading', { name: 'Import from Google Drive' })).toBeVisible();
    await expect(page.getByText('Master Service Agreement.docx')).toBeVisible();

    await page.getByText('Master Service Agreement.docx').click();
    await page.getByRole('button', { name: 'Import' }).click();

    await expect(page).toHaveURL(/.*\/contracts\/new-contract-from-gdrive-uuid/);
    await expect(page.getByRole('heading', { name: 'Master Service Agreement.docx' })).toBeVisible();
  });
});