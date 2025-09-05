import { test, expect } from '@playwright/test';

test.describe('Contract Insights & Reporting Engine', () => {
  const reportName = `Test Report ${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test.user@examplecorp.com');
    await page.fill('input[name="password"]', 'a_strong_password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should allow a user to create, view, edit, and delete a custom report', async ({ page }) => {
    // 1. Navigate to the reports dashboard
    await page.goto('/dashboard/reports');
    await expect(page.getByRole('heading', { name: 'Custom Reports' })).toBeVisible();

    // 2. Start creating a new report
    await page.getByRole('link', { name: 'Create Report' }).click();
    await expect(page).toHaveURL('/dashboard/reports/builder');
    await expect(page.getByRole('heading', { name: 'Configure Report' })).toBeVisible();

    // 3. Configure the report (add a "Group By")
    await page.getByRole('button', { name: 'Select field to group by' }).click();
    await page.getByLabel('Negotiation Status').click();

    // 4. Run the query and check for preview
    await page.getByRole('button', { name: 'Run Query' }).click();
    await expect(page.getByText('Live Preview')).toBeVisible();
    await expect(page.locator('.recharts-surface')).toBeVisible({ timeout: 10000 }); // Wait for chart

    // 5. Save the report
    await page.getByRole('button', { name: 'Save Report' }).click();
    await expect(page.getByRole('heading', { name: 'Save Report' })).toBeVisible();
    await page.getByLabel('Report Name').fill(reportName);
    await page.getByLabel('Description').fill('A test report for E2E testing.');
    await page.getByRole('button', { name: 'Save' }).click();

    // 6. Verify redirection and that the new report is listed
    await expect(page).toHaveURL('/dashboard/reports');
    await expect(page.getByRole('cell', { name: reportName })).toBeVisible();

    // 7. Edit the report
    const reportRow = page.getByRole('row', { name: reportName });
    await reportRow.getByRole('button', { name: 'Toggle menu' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    // 8. Verify the builder is loaded with the correct config
    await expect(page).toHaveURL(/\/dashboard\/reports\/builder\?id=.*/);
    await expect(page.locator('input[type="text"]').first()).toHaveValue(reportName);
    await expect(page.getByText('Negotiation Status')).toBeVisible();

    // 9. Go back and delete the report
    await page.goto('/dashboard/reports');
    const reportRowToDelete = page.getByRole('row', { name: reportName });
    await reportRowToDelete.getByRole('button', { name: 'Toggle menu' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    // 10. Confirm deletion
    await expect(page.getByRole('heading', { name: 'Are you sure?' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();

    // 11. Verify the report is gone
    await expect(page.getByRole('cell', { name: reportName })).not.toBeVisible();
    await expect(page.getByText(`Report "${reportName}" deleted successfully.`)).toBeVisible();
  });
});