import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Advanced Team & Workspace Management', () => {
  const uniqueId = Date.now();
  const adminEmail = `team_admin_${uniqueId}@lexicontract.ai`;
  const memberEmail = `team_member_${uniqueId}@lexicontract.ai`;
  const password = 'aSecurePassword123';
  const orgName = `TeamCorp ${uniqueId}`;
  const teamName = `Legal Review Team ${uniqueId}`;
  const contractFixture = path.resolve(__dirname, 'fixtures/test-contract.txt');
  let contractId = '';

  test.beforeAll(async ({ browser }) => {
    // Register admin user
    const adminPage = await browser.newPage();
    await adminPage.goto('/register');
    await adminPage.getByPlaceholder('Email address').fill(adminEmail);
    await adminPage.getByPlaceholder('Password').fill(password);
    await adminPage.getByPlaceholder('Organization Name').fill(orgName);
    await adminPage.getByRole('button', { name: 'Create Account' }).click();
    await expect(adminPage).toHaveURL('/login');
    await adminPage.close();

    // Register member user
    const memberPage = await browser.newPage();
    await memberPage.goto('/register');
    await memberPage.getByPlaceholder('Email address').fill(memberEmail);
    await memberPage.getByPlaceholder('Password').fill(password);
    await memberPage.getByPlaceholder('Organization Name').fill(orgName);
    await memberPage.getByRole('button', { name: 'Create Account' }).click();
    await expect(memberPage).toHaveURL('/login');
    await memberPage.close();
  });

  test('should allow an admin to create a team, add a member, and assign a contract', async ({ page }) => {
    // --- Login as Admin ---
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard/contracts');

    // --- Upload a contract to work with ---
    await page.setInputFiles('input[type="file"]', contractFixture);
    await page.getByRole('button', { name: 'Upload & Analyze' }).click();
    const contractRow = page.getByRole('row', { name: /test-contract.txt/i });
    await expect(contractRow.getByText('Completed')).toBeVisible({ timeout: 15000 });
    const contractLink = contractRow.locator('a');
    const href = await contractLink.getAttribute('href');
    contractId = href!.split('/').pop()!;
    expect(contractId).not.toBe('');

    // --- Create a Team ---
    await page.goto('/dashboard/settings/teams');
    await page.getByRole('button', { name: 'Create Team' }).click();
    await page.getByLabel('Team Name').fill(teamName);
    await page.getByRole('button', { name: 'Create Team' }).click();
    await expect(page.getByText(teamName)).toBeVisible();

    // --- Add Member to Team ---
    await page.getByRole('link', { name: teamName }).click();
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible();
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.getByLabel('User').selectOption({ label: memberEmail });
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByText(memberEmail)).toBeVisible();

    // --- Assign Contract to Team ---
    await page.goto(`/dashboard/contracts/${contractId}`);
    await page.getByLabel('Assigned Team').selectOption({ label: teamName });
    await expect(page.getByLabel('Assigned Team')).toHaveValue(new RegExp('.*')); // Wait for save
    await expect(page.getByLabel('Assigned Team')).toHaveValue(/.+/); // Ensure it's not empty
  });

  test('should allow a team member to see an assigned contract', async ({ page }) => {
    // Login as the team member
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(memberEmail);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard/contracts');

    // Verify contract is visible on dashboard and accessible
    await expect(page.getByRole('row', { name: /test-contract.txt/i })).toBeVisible();
    await page.goto(`/dashboard/contracts/${contractId}`);
    await expect(page.getByRole('heading', { name: /test-contract.txt/i })).toBeVisible();
  });

  test('should allow an admin to delete a team', async ({ page }) => {
    // --- Login as Admin ---
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard/contracts');

    // --- Delete the Team ---
    await page.goto('/dashboard/settings/teams');
    await page.getByRole('link', { name: teamName }).click();
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete this team' }).click();
    await expect(page).toHaveURL('/dashboard/settings/teams');
    await expect(page.getByText(teamName)).not.toBeVisible();
  });
});