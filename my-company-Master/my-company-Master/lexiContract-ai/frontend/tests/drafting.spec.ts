import { test, expect, request } from '@playwright/test';

test.describe('AI-Powered Contract Drafting Flow', () => {
  const uniqueId = Date.now();
  const orgName = `DraftCorp ${uniqueId}`;
  const adminEmail = `admin_draft_${uniqueId}@lexicontract.ai`;
  const adminPassword = 'aSecurePassword123';

  test.beforeAll(async ({ browser, request: apiRequest }) => {
    // Register Admin
    const page = await browser.newPage();
    await page.goto('/register');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByPlaceholder('Organization Name').fill(orgName);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/login');

    // Login and get token
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');
    const token = await page.evaluate(() => document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]);

    // Activate subscription
    await apiRequest.patch('/api/v1/testing/update-subscription', {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'active' },
    });

    await page.close();
  });

  test('Admin should be able to manage templates and draft a contract', async ({ page }) => {
    // 1. Login as admin
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    // 2. Navigate to Templates page and create a new template
    await page.getByRole('link', { name: 'Templates' }).click();
    await expect(page).toHaveURL('/templates');
    await page.getByRole('button', { name: 'Add Template' }).click();

    const templateTitle = `NDA Template ${uniqueId}`;
    const templateContent = `This Non-Disclosure Agreement is between {{ party_a }} and {{ party_b }}.`;
    await page.getByLabel('Title').fill(templateTitle);
    await page.getByLabel('Content').fill(templateContent);
    await page.getByRole('button', { name: 'Save Template' }).click();

    // 3. Verify template creation
    await expect(page.getByRole('heading', { name: templateTitle })).toBeVisible();
    await expect(page.getByText(templateContent)).toBeVisible();

    // 4. Navigate to Drafting page
    await page.getByRole('link', { name: 'Drafting' }).click();
    await expect(page).toHaveURL('/drafting');
    await expect(page.getByRole('heading', { name: 'Draft a New Contract' })).toBeVisible();

    // 5. Select the newly created template
    await page.getByRole('button', { name: templateTitle }).click();
    await expect(page.getByRole('heading', { name: '2. Fill in the Details' })).toBeVisible();

    // 6. Fill in the variables
    const partyA = 'InnovateCorp';
    const partyB = 'Partner LLC';
    await expect(page.getByLabel('party_a')).toBeVisible();
    await expect(page.getByLabel('party_b')).toBeVisible();

    await page.getByLabel('party_a').fill(partyA);
    await page.getByLabel('party_b').fill(partyB);

    // 7. Generate the contract
    await page.getByRole('button', { name: 'Generate Contract' }).click();

    // 8. Verify the generated content
    await expect(page.getByRole('heading', { name: '3. Contract Draft' })).toBeVisible();
    const draftContainer = page.locator('div', { hasText: 'Contract Draft' }).locator('div').last();
    const expectedDraft = `This Non-Disclosure Agreement is between ${partyA} and ${partyB}.`;
    await expect(draftContainer).toHaveText(expectedDraft);

    // 9. Go back and delete the template to clean up
    await page.getByRole('link', { name: 'Templates' }).click();
    await expect(page).toHaveURL('/templates');
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('heading', { name: templateTitle })).not.toBeVisible();
  });
});