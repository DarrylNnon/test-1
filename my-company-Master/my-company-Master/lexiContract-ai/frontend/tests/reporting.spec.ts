import { test, expect } from '@playwright/test';

test.describe('Contract Insights & Reporting Engine', () => {
  const reportName = `E2E Test Report - ${Date.now()}`;
  const updatedReportName = `${reportName} (Updated)`;

  test.beforeEach(async ({ page }) => {
    // A test user must exist. This can be created via a seeding script or previous test.
    // For this test, we assume the user 'test.user@examplecorp.com' with password 'a_strong_password' exists.
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test.user@examplecorp.com');
    await page.fill('input[name="password"]', 'a_strong_password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard/contracts'); // Assuming login redirects to contracts dashboard
  });

  test('should allow a user to create, view, edit, and delete a custom report', async ({ page }) => {
    // 1. Navigate to reports dashboard and create a new report
    await page.goto('/dashboard/reports');
    await page.getByRole('link', { name: 'Create New Report' }).click();
    await expect(page).toHaveURL('/dashboard/reports/builder');

    // 2. Build the report
    await expect(page.getByText('Report Builder')).toBeVisible();
    await page.getByLabel('Group By').selectOption('negotiation_status');

    // Wait for the preview to load by checking for the chart legend
    await expect(page.getByText('Count of contracts', { timeout: 10000 })).toBeVisible();

    // 3. Save the report
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Save Report' })).toBeVisible();
    await page.getByLabel('Report Name').fill(reportName);
    await page.getByLabel('Description (Optional)').fill('This is an E2E test report.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // 4. Verify redirection and that the new report is listed
    await expect(page).toHaveURL('/dashboard/reports');
    await expect(page.getByRole('heading', { name: reportName })).toBeVisible();

    // 5. Edit the report
    await page.getByRole('link', { name: 'Edit' }).first().click();
    await expect(page).toHaveURL(new RegExp('/dashboard/reports/builder\\?id=.*'));
    await expect(page.getByRole('heading', { name: 'Edit Report' })).toBeVisible();
    await expect(page.getByLabel('Group By')).toHaveValue('negotiation_status');

    // 6. Update and save the report
    await page.getByRole('button', { name: 'Update' }).click();
    await page.getByLabel('Report Name').fill(updatedReportName);
    await page.getByRole('button', { name: 'Save' }).click();

    // 7. Verify the update and then delete the report
    await expect(page.getByRole('heading', { name: updatedReportName })).toBeVisible();
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByRole('heading', { name: updatedReportName })).not.toBeVisible();
  });
});