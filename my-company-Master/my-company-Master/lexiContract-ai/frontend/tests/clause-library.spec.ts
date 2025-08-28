import { test, expect, request } from '@playwright/test';

test.describe('Clause Library CRUD and Permissions', () => {
  const uniqueId = Date.now();
  const orgName = `ClauseCorp ${uniqueId}`;
  const adminEmail = `admin_clause_${uniqueId}@lexicontract.ai`;
  const adminPassword = 'aSecurePassword123';
  const memberEmail = `member_clause_${uniqueId}@lexicontract.ai`;
  const memberPassword = 'aSecurePassword123';

  test.beforeAll(async ({ browser }) => {
    // Register Admin (first user in org, becomes admin)
    const adminPage = await browser.newPage();
    await adminPage.goto('/register');
    await adminPage.getByPlaceholder('Email address').fill(adminEmail);
    await adminPage.getByPlaceholder('Password').fill(adminPassword);
    await adminPage.getByPlaceholder('Organization Name').fill(orgName);
    await adminPage.getByRole('button', { name: 'Create Account' }).click();
    await expect(adminPage).toHaveURL('/login');
    await adminPage.close();

    // Register Member (second user in the same org, becomes member)
    const memberPage = await browser.newPage();
    await memberPage.goto('/register');
    await memberPage.getByPlaceholder('Email address').fill(memberEmail);
    await memberPage.getByPlaceholder('Password').fill(memberPassword);
    await memberPage.getByPlaceholder('Organization Name').fill(orgName);
    await memberPage.getByRole('button', { name: 'Create Account' }).click();
    await expect(memberPage).toHaveURL('/login');
    await memberPage.close();
  });

  test('Admin user should have full CRUD access to the Clause Library', async ({ page, request: apiRequest }) => {
    // 1. Login as admin and activate subscription
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    const token = await page.evaluate(() => document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]);
    expect(token).toBeDefined();

    const updateSubResponse = await apiRequest.patch('/api/v1/testing/update-subscription', {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'active' },
    });
    expect(updateSubResponse.ok()).toBeTruthy();

    // 2. Navigate to Clause Library
    await page.getByRole('link', { name: 'Clause Library' }).click();
    await expect(page).toHaveURL('/clause-library');
    await expect(page.getByRole('heading', { name: 'Clause Library' })).toBeVisible();

    // 3. Create a new clause
    await page.getByRole('button', { name: 'Add Clause' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Clause' })).toBeVisible();
    
    const clauseTitle = `Indemnification Clause ${uniqueId}`;
    const clauseContent = 'The party shall indemnify and hold harmless...';
    await page.getByLabel('Title').fill(clauseTitle);
    await page.getByLabel('Content').fill(clauseContent);
    await page.getByRole('button', { name: 'Save Clause' }).click();

    // 4. Verify clause creation
    await expect(page.getByRole('heading', { name: clauseTitle })).toBeVisible();
    await expect(page.getByText(clauseContent)).toBeVisible();
    await expect(page.getByText(`Last updated by ${adminEmail}`)).toBeVisible();

    // 5. Edit the clause
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Clause' })).toBeVisible();
    
    const updatedContent = 'The party shall indemnify, defend, and hold harmless...';
    await page.getByLabel('Content').fill(updatedContent);
    await page.getByRole('button', { name: 'Save Clause' }).click();
    
    // 6. Verify clause update
    await expect(page.getByText(updatedContent)).toBeVisible();
    await expect(page.getByText(clauseContent)).not.toBeVisible();

    // 7. Delete the clause
    page.on('dialog', dialog => dialog.accept()); // Auto-accept the confirm dialog
    await page.getByRole('button', { name: 'Delete' }).click();

    // 8. Verify clause deletion
    await expect(page.getByRole('heading', { name: clauseTitle })).not.toBeVisible();
    await expect(page.getByText('No Clauses Found')).toBeVisible();
  });

  test('Member user should have read-only access to the Clause Library', async ({ page, request: apiRequest }) => {
    // SETUP: Admin logs in and creates a clause for the member to see
    const adminApiContext = await apiRequest.newContext();
    const tokenResponse = await adminApiContext.post('/api/v1/auth/token', {
      form: { username: adminEmail, password: adminPassword },
    });
    expect(tokenResponse.ok()).toBeTruthy();
    const adminToken = (await tokenResponse.json()).access_token;

    const clauseTitle = `Confidentiality Clause ${uniqueId}`;
    const createClauseResponse = await adminApiContext.post('/api/v1/clauses/', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { title: clauseTitle, content: 'This is a standard confidentiality clause.', category: 'Confidentiality' },
    });
    expect(createClauseResponse.ok()).toBeTruthy();

    // 1. Login as member
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(memberEmail);
    await page.getByPlaceholder('Password').fill(memberPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    // 2. Navigate to Clause Library
    await page.getByRole('link', { name: 'Clause Library' }).click();
    await expect(page).toHaveURL('/clause-library');

    // 3. Verify read-only access: clause is visible
    await expect(page.getByRole('heading', { name: clauseTitle })).toBeVisible();

    // 4. Assert that admin controls are NOT visible
    await expect(page.getByRole('button', { name: 'Add Clause' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).not.toBeVisible();
  });
});