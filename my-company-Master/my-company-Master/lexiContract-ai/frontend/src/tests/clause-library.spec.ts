import { test, expect } from '@playwright/test';

test.describe('Clause Library Management', () => {
  const uniqueId = Date.now();
  const adminEmail = `clause_admin_${uniqueId}@lexicontract.ai`;
  const adminPassword = 'aSecurePassword123';
  const orgName = `ClauseCorp ${uniqueId}`;

  // Register an admin user before running the tests
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/register');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByPlaceholder('Organization Name').fill(orgName);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/login');
    await page.close();
  });

  test('should allow an admin to create, edit, and delete a clause', async ({ page }) => {
    // --- 1. Login as Admin and go to Settings ---
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Organization Settings' })).toBeVisible();

    // --- 2. Create a new clause ---
    const clauseTitle = `Confidentiality Clause ${uniqueId}`;
    const clauseContent = 'All information shared between parties must be kept confidential.';

    await page.getByRole('button', { name: 'Create Clause' }).click();

    // Modal should be visible
    await expect(page.getByRole('heading', { name: 'Create New Clause' })).toBeVisible();

    await page.getByLabel('Title').fill(clauseTitle);
    await page.getByLabel('Content').fill(clauseContent);
    await page.getByRole('button', { name: 'Save Clause' }).click();

    // --- 3. Verify the clause was created ---
    const clauseRow = page.getByRole('row', { name: new RegExp(clauseTitle) });
    await expect(clauseRow).toBeVisible();
    await expect(clauseRow.getByText(new Date().toLocaleDateString())).toBeVisible();

    // --- 4. Edit the clause ---
    const updatedClauseContent = 'All proprietary information must be kept strictly confidential for a period of 5 years.';
    await clauseRow.getByRole('button', { name: 'Edit' }).click();

    // Modal should be visible for editing
    await expect(page.getByRole('heading', { name: 'Edit Clause' })).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveValue(clauseTitle); // Title should be pre-filled

    await page.getByLabel('Content').fill(updatedClauseContent);
    await page.getByRole('button', { name: 'Save Clause' }).click();

    // --- 5. Delete the clause ---
    // Playwright's dialog handler is needed for window.confirm
    page.on('dialog', dialog => dialog.accept());
    await clauseRow.getByRole('button', { name: 'Delete' }).click();

    // --- 6. Verify the clause was deleted ---
    await expect(clauseRow).not.toBeVisible();
  });
});