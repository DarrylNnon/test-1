import { test, expect, Page } from '@playwright/test';

const adminUser = { email: 'admin@example.com', password: 'password123' };
const legalUser = { email: 'legal.user@example.com', password: 'password123' };
const salesUser = { email: 'sales.user@example.com', password: 'password123' };

// Let's assume this contract exists and has sensitivity_level: "High"
const highSensitivityContractId = 'd8e2a9d8-8a1b-4e2e-8f2c-3b5a6d7e8f9a'; 
const highSensitivityContractName = 'Project Titan Master Services Agreement';

const policyName = 'Legal High-Sensitivity Viewers';

async function login(page: Page, user: { email: string, password: string }) {
  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
}

async function logout(page: Page) {
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');
}

test.describe('Advanced Access Control (ABAC) Workflow', () => {

  // Cleanup step: Ensure the policy is deleted after all tests run
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page, adminUser);
    await page.goto('/settings/policies');
    const policyRow = page.locator(`tr:has-text("${policyName}")`);
    if (await policyRow.isVisible()) {
      await policyRow.locator('button:has-text("Delete")').click();
      page.on('dialog', dialog => dialog.accept());
      await expect(policyRow).not.toBeVisible();
    }
    await page.close();
  });

  test('step 1: legal user is denied access by default', async ({ page }) => {
    await login(page, legalUser);
    await page.goto(`/contracts/${highSensitivityContractId}`);
    // Expect a "Forbidden" or "Not Found" message, as access is denied
    await expect(page.locator('text=You do not have permission to view this contract')).toBeVisible();
  });

  test('step 2: admin creates a specific access policy', async ({ page }) => {
    await login(page, adminUser);
    await page.goto('/settings/policies');

    await page.fill('#policy-name', policyName);
    await page.fill('#policy-actions', 'view');
    await page.fill('#subject-attrs', '{\n  "department": "Legal"\n}');
    await page.fill('#resource-attrs', '{\n  "sensitivity_level": "High"\n}');
    
    await page.click('button[type="submit"]');

    // Verify the policy was created and is visible in the list
    await expect(page.locator(`tr:has-text("${policyName}")`)).toBeVisible();
    await expect(page.locator('td:has-text(\'{"department":"Legal"}\')')).toBeVisible();
    await expect(page.locator('td:has-text(\'{"sensitivity_level":"High"}\')')).toBeVisible();
  });

  test('step 3: legal user can now access the contract', async ({ page }) => {
    await login(page, legalUser);
    await page.goto(`/contracts/${highSensitivityContractId}`);
    // Now, the user should be able to see the contract details
    await expect(page.locator(`h1:has-text("${highSensitivityContractName}")`)).toBeVisible();
    await expect(page.locator('text=You do not have permission')).not.toBeVisible();
  });

  test('step 4: sales user is still denied access', async ({ page }) => {
    await login(page, salesUser);
    await page.goto(`/contracts/${highSensitivityContractId}`);
    // The policy does not apply to the sales user, so they should be denied
    await expect(page.locator('text=You do not have permission to view this contract')).toBeVisible();
  });

  test('step 5: admin deletes the access policy', async ({ page }) => {
    await login(page, adminUser);
    await page.goto('/settings/policies');

    const policyRow = page.locator(`tr:has-text("${policyName}")`);
    await expect(policyRow).toBeVisible();

    // Set up listener for the confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    await policyRow.locator('button:has-text("Delete")').click();

    // Verify the policy is removed from the list
    await expect(policyRow).not.toBeVisible();
  });

  test('step 6: legal user access is revoked', async ({ page }) => {
    await login(page, legalUser);
    await page.goto(`/contracts/${highSensitivityContractId}`);
    // With the policy gone, access should be denied again
    await expect(page.locator('text=You do not have permission to view this contract')).toBeVisible();
  });

});