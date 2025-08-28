import { test, expect, Page } from '@playwright/test';
import path from 'path';

test.describe('E-Signature Flow', () => {
  const uniqueId = Date.now();
  const adminEmail = `esign_admin_${uniqueId}@lexicontract.ai`;
  const adminPassword = 'aSecurePassword123';
  const orgName = `E-SignCorp ${uniqueId}`;
  const contractFixture = path.resolve(__dirname, 'fixtures/test-contract.txt');

  let contractUrl: string;

  // Helper function to log in a user
  const login = async (page: Page, email: string, password: string) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');
  };

  test.beforeAll(async ({ browser }) => {
    // --- Setup: Register Admin and Upload Contract ---
    const setupContext = await browser.newContext();
    const setupPage = await setupContext.newPage();

    // Register admin
    await setupPage.goto('/register');
    await setupPage.getByPlaceholder('Email address').fill(adminEmail);
    await setupPage.getByPlaceholder('Password').fill(adminPassword);
    await setupPage.getByPlaceholder('Organization Name').fill(orgName);
    await setupPage.getByRole('button', { name: 'Create Account' }).click();
    await expect(setupPage).toHaveURL('/login');

    // Login as admin
    await login(setupPage, adminEmail, adminPassword);

    // Upload contract
    await setupPage.setInputFiles('input[type="file"]', contractFixture);
    await setupPage.getByRole('button', { name: 'Upload & Analyze' }).click();
    const contractRow = setupPage.getByRole('row', { name: /test-contract.txt/i });
    await expect(contractRow.getByText('Completed')).toBeVisible({ timeout: 15000 });
    await contractRow.click();
    await expect(setupPage.getByRole('heading', { name: 'Activity Feed' })).toBeVisible();
    
    contractUrl = setupPage.url();

    await setupContext.close();
  });

  test('should allow sending for signature and reflect webhook updates', async ({ page, request: apiRequest }) => {
    // 1. Login and navigate to the contract
    await login(page, adminEmail, adminPassword);
    await page.goto(contractUrl);

    // 2. Intercept the API call to get the signature_request_id from its response
    const signaturePromise = page.waitForResponse(resp => resp.url().includes('/send-for-signature') && resp.status() === 202);

    // 3. Open the signature modal and fill it out
    const sendButton = page.getByRole('button', { name: 'Send for Signature' });
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    const modal = page.locator('.fixed.inset-0', { hasText: 'Send for Signature' });
    await expect(modal).toBeVisible();
    await modal.getByPlaceholder('Signer Name').fill('John Signer');
    await modal.getByPlaceholder('Signer Email').fill('john.signer@example.com');
    
    // 4. Submit the request
    await modal.getByRole('button', { name: 'Send' }).click();

    // 5. Verify optimistic UI update and capture the request ID from the API response
    await expect(modal).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Signature Pending' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'sent' })).toBeVisible();

    const signatureResponse = await signaturePromise;
    const signatureJson = await signatureResponse.json();
    const signatureRequestId = signatureJson.signature_request_id;
    expect(signatureRequestId).toContain('sig_req_');

    // 6. Simulate webhook callback for "all_signed" event using the captured ID
    const webhookResponse = await apiRequest.post('http://localhost:8000/api/v1/contracts/signature-webhook', {
      data: { event_type: 'all_signed', signature_request_id: signatureRequestId },
    });
    expect(webhookResponse.ok()).toBeTruthy();

    // 7. Verify the final real-time UI update from the WebSocket broadcast
    await expect(page.locator('span', { hasText: 'signed' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Send for Signature' })).toBeDisabled();
  });
});