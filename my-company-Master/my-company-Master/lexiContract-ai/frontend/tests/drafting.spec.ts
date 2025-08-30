import { test, expect } from '@playwright/test';

test.describe('AI-Powered Contract Drafting Flow', () => {
  const uniqueId = Date.now();
  const orgName = `DraftCorp ${uniqueId}`;
  const adminEmail = `admin_draft_${uniqueId}@lexicontract.ai`;
  const adminPassword = 'aSecurePassword123';

  test.beforeAll(async ({ request }) => {
    // Register a new user and organization for this test run.
    // This user will be an admin by default.
    const regResponse = await request.post('http://localhost:8000/api/v1/auth/register', {
      data: {
        email: adminEmail,
        password: adminPassword,
        organization_name: orgName,
      },
    });
    expect(regResponse.ok()).toBeTruthy();
  });

  test('Admin should be able to create a template, draft a contract, and finalize it', async ({ page, request }) => {
    // 1. Login as admin
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    // As this is a test environment, we'll get the token to activate the subscription
    const token = await page.evaluate(() => document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]);
    expect(token).toBeDefined();

    // 2. Activate subscription via a testing utility endpoint to access premium features
    const subResponse = await request.patch('/api/v1/testing/update-subscription', {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'active' },
    });
    expect(subResponse.ok()).toBeTruthy();

    // 3. Navigate to Templates page and create a new template
    await page.getByRole('link', { name: 'Templates' }).click();
    await expect(page).toHaveURL('/dashboard/templates');
    await page.getByRole('button', { name: 'Add Template' }).click();

    const templateTitle = `Standard MSA Template ${uniqueId}`;
    const templateContent = `This Master Services Agreement is between {{ our_company_name }} and {{ counterparty_name }}.`;
    await page.getByLabel('Title').fill(templateTitle);
    await page.getByLabel('Content').fill(templateContent);
    await page.getByRole('button', { name: 'Save Template' }).click();
    await expect(page.getByRole('heading', { name: templateTitle })).toBeVisible();

    // 4. Navigate to Drafting page and select the new template
    await page.getByRole('link', { name: 'Drafting' }).click();
    await expect(page).toHaveURL('/dashboard/drafting');
    await page.getByRole('button', { name: templateTitle }).click();
    await expect(page.getByRole('heading', { name: `Step 2: Fill in the Details for "${templateTitle}"` })).toBeVisible();

    // 5. Fill in the variables
    const ourCompany = 'LexiContract AI Inc.';
    const counterparty = 'Global Tech Solutions';
    await page.getByLabel('Our Company Name').fill(ourCompany);
    await page.getByLabel('Counterparty Name').fill(counterparty);

    // 6. Generate the preview
    await page.getByRole('button', { name: 'Generate Preview' }).click();
    await expect(page.getByRole('heading', { name: 'Step 3: Preview & Create Contract' })).toBeVisible();

    // 7. Verify the preview content
    const expectedDraft = `This Master Services Agreement is between ${ourCompany} and ${counterparty}.`;
    await expect(page.locator('.font-mono')).toHaveText(expectedDraft);

    // 8. Finalize the contract
    const finalizePromise = page.waitForResponse(resp => resp.url().includes('/api/v1/drafting/finalize') && resp.status() === 201);
    await page.getByRole('button', { name: 'Create Contract' }).click();
    const finalizeResponse = await finalizePromise;
    expect(finalizeResponse.ok()).toBeTruthy();

    // 9. Verify redirection to the new contract's page
    await expect(page).toHaveURL(/\/dashboard\/contracts\/[a-f0-9-]+/);
    await expect(page.getByRole('heading', { name: `${templateTitle}.txt` })).toBeVisible();
  });
});