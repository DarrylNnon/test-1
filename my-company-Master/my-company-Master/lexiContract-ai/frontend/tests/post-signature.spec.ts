import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Post-Signature Management Flow', () => {
  const uniqueId = Date.now();
  const userEmail = `post_sig_user_${uniqueId}@lexicontract.ai`;
  const password = 'aSecurePassword123';
  const orgName = `PostSigCorp ${uniqueId}`;
  const contractPath = path.resolve(__dirname, '../../test_data/sample_contract.txt');

  // Register the user before running tests
  test.beforeAll(async ({ request }) => {
    const response = await request.post('http://localhost:8000/api/v1/auth/register', {
      data: {
        email: userEmail,
        password: password,
        organization_name: orgName,
      },
    });
    expect(response.ok()).toBeTruthy();
  });

  test('should allow a user to update an obligation status', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    // 2. Upload the contract
    await page.getByLabel('Upload contract').setInputFiles(contractPath);
    await expect(page.getByText('sample_contract.txt')).toBeVisible();

    // 3. Navigate to the contract and mark as Signed
    await page.getByRole('link', { name: 'sample_contract.txt' }).click();
    await expect(page.getByRole('heading', { name: 'sample_contract.txt' })).toBeVisible();
    
    // Change status to trigger post-signature analysis
    // We assume the select element has a data-testid for robust selection
    await page.locator('select').first().selectOption('SIGNED');
    
    // Wait for analysis to re-run and data to be extracted.
    // A more robust solution would be to poll the API for completion,
    // but a timeout is sufficient for this demonstration.
    await page.waitForTimeout(3000); 

    // 4. Navigate to Management Tab
    await page.getByRole('tab', { name: 'Management' }).click();

    // 5. Find the specific obligation and update its status
    const obligationRow = page.locator('tr', { hasText: 'Client is responsible for paying all invoices' });
    await expect(obligationRow).toBeVisible();

    const statusDropdown = obligationRow.locator('select');
    await expect(statusDropdown).toHaveValue('Pending');

    // Intercept the PUT request to verify the API call was successful
    const apiPromise = page.waitForResponse(resp => 
      resp.url().includes('/api/v1/obligations/') && resp.request().method() === 'PUT'
    );

    await statusDropdown.selectOption('In Progress');
    
    const apiResponse = await apiPromise;
    expect(apiResponse.ok()).toBeTruthy();

    // 6. Verify the UI has updated to reflect the change
    await expect(statusDropdown).toHaveValue('In Progress');
  });
});