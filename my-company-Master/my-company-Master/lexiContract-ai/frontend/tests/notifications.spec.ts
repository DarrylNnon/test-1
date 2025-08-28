import { test, expect, Page } from '@playwright/test';
import path from 'path';

test.describe('In-App Notifications', () => {
  const uniqueId = Date.now();
  const adminEmail = `notify_admin_${uniqueId}@lexicontract.ai`;
  const adminPassword = 'aSecurePassword123';
  const orgName = `NotifyCorp ${uniqueId}`;
  const contractFixture = path.resolve(__dirname, 'fixtures/test-contract.txt');

  let contractUrl: string;

  // Helper function to log in a user
  const login = async (page: Page, email: string, password:string) => {
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

  test('should display a notification when a contract is signed', async ({ page, request: apiRequest }) => {
    // 1. Login and navigate to the contract
    await login(page, adminEmail, adminPassword);
    await page.goto(contractUrl);

    // 2. Intercept the API call to get the signature_request_id
    const signaturePromise = page.waitForResponse(resp => resp.url().includes('/send-for-signature'));

    // 3. Send the contract for signature
    await page.getByRole('button', { name: 'Send for Signature' }).click();
    const modal = page.locator('.fixed.inset-0', { hasText: 'Send for Signature' });
    await modal.getByPlaceholder('Signer Name').fill('John Signer');
    await modal.getByPlaceholder('Signer Email').fill('john.signer@example.com');
    await modal.getByRole('button', { name: 'Send' }).click();

    const signatureResponse = await signaturePromise;
    const signatureJson = await signatureResponse.json();
    const signatureRequestId = signatureJson.signature_request_id;

    // 4. Simulate the webhook callback that triggers the notification
    const webhookResponse = await apiRequest.post('http://localhost:8000/api/v1/contracts/signature-webhook', {
      data: { event_type: 'all_signed', signature_request_id: signatureRequestId },
    });
    expect(webhookResponse.ok()).toBeTruthy();

    // 5. Verify the notification appears in the UI
    const notificationBell = page.locator('button', { has: page.locator('svg.h-6.w-6') });
    await expect(notificationBell.locator('span.absolute')).toBeVisible({ timeout: 5000 }); // The red dot

    await notificationBell.click();
    const notificationText = `Contract 'test-contract.txt' has been fully signed.`;
    await expect(page.locator('div', { hasText: notificationText })).toBeVisible();
  });
});