import { test, expect, request } from '@playwright/test';

test.describe('User Invitation and Activation Flow', () => {
  const uniqueId = Date.now();
  const adminEmail = `admin_${uniqueId}@lexicontract.ai`;
  const adminPassword = 'aSecurePassword123';
  const orgName = `InviteCorp ${uniqueId}`;
  const invitedUserEmail = `invited_user_${uniqueId}@lexicontract.ai`;
  const invitedUserPassword = 'aNewSecurePassword456';

  let adminAuthToken: string;

  test.beforeAll(async ({ browser }) => {
    // --- Register an admin user once for the entire test suite ---
    const page = await browser.newPage();
    await page.goto('/register');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByPlaceholder('Organization Name').fill(orgName);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/login');
    await page.close();
  });

  test('should allow an admin to invite a user, and the user can activate their account', async ({ page, browser }) => {
    // --- 1. Admin logs in and navigates to settings ---
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    // Navigate to settings via the new header link
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Organization Settings' })).toBeVisible();

    // --- 2. Admin invites a new user via the UI ---
    await page.getByPlaceholder('new.member@example.com').fill(invitedUserEmail);
    await page.getByRole('button', { name: 'Send Invite' }).click();

    // --- 3. Assert the invited user appears in the list ---
    const userRow = page.getByRole('row', { name: new RegExp(invitedUserEmail) });
    await expect(userRow).toBeVisible();
    await expect(userRow.getByText('invited')).toBeVisible();

    // --- 4. Get the activation token via API ---
    // This is a hybrid approach common in E2E testing for out-of-band flows (like email).
    // We first get an auth token for the admin.
    const apiContext = await request.newContext();
    const tokenResponse = await apiContext.post('http://localhost:8000/api/v1/auth/token', {
      form: { username: adminEmail, password: adminPassword },
    });
    expect(tokenResponse.ok()).toBeTruthy();
    const tokenJson = await tokenResponse.json();
    adminAuthToken = tokenJson.access_token;

    // Then, we call the invite endpoint again via API to capture the activation token from the response.
    const inviteResponse = await apiContext.post('http://localhost:8000/api/v1/users/organization/invite', {
      headers: { Authorization: `Bearer ${adminAuthToken}` },
      data: { email: `second_invite_${uniqueId}@lexicontract.ai` }, // Use a new email to avoid conflict
    });
    expect(inviteResponse.ok()).toBeTruthy();
    const inviteJson = await inviteResponse.json();
    const activationToken = inviteJson.activation_token;
    expect(activationToken).toBeDefined();

    // --- 5. Invited user activates their account in a new browser context ---
    const invitedUserContext = await browser.newContext();
    const invitedUserPage = await invitedUserContext.newPage();
    await invitedUserPage.goto(`/activate-account?token=${activationToken}`);
    await expect(invitedUserPage.getByRole('heading', { name: 'Activate Your Account' })).toBeVisible();

    await invitedUserPage.getByPlaceholder('Password').fill(invitedUserPassword);
    await invitedUserPage.getByPlaceholder('Confirm Password').fill(invitedUserPassword);
    await invitedUserPage.getByRole('button', { name: 'Activate Account' }).click();

    await expect(invitedUserPage.getByText('Your account has been activated successfully!')).toBeVisible();
    await expect(invitedUserPage).toHaveURL('/login', { timeout: 5000 });

    await invitedUserContext.close();
  });
});