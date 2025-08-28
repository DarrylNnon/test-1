import { test, expect, Page } from '@playwright/test';

test.describe('Admin Settings Page', () => {
  const uniqueId = Date.now();
  const adminEmail = `settings_admin_${uniqueId}@lexicontract.ai`;
  const adminPassword = 'aSecurePassword123';
  const orgName = `SettingsCorp ${uniqueId}`;
  const memberEmail = `settings_member_${uniqueId}@lexicontract.ai`;
  const memberPassword = 'aMemberPassword456';

  // Helper to log in
  const login = async (page: Page, email: string, password: string) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');
  };

  // Setup: Register admin, invite and activate a member
  test.beforeAll(async ({ browser, request }) => {
    const setupContext = await browser.newContext();
    const setupPage = await setupContext.newPage();

    // Register admin
    await setupPage.goto('/register');
    await setupPage.getByPlaceholder('Email address').fill(adminEmail);
    await setupPage.getByPlaceholder('Password').fill(adminPassword);
    await setupPage.getByPlaceholder('Organization Name').fill(orgName);
    await setupPage.getByRole('button', { name: 'Create Account' }).click();
    await expect(setupPage).toHaveURL('/login');

    // Login as admin to get token
    const tokenResponse = await request.post('http://localhost:8000/api/v1/auth/token', {
      form: { username: adminEmail, password: adminPassword },
    });
    const tokenJson = await tokenResponse.json();
    const adminAuthToken = tokenJson.access_token;

    // Invite member via API
    const inviteResponse = await request.post('http://localhost:8000/api/v1/users/organization/invite', {
      headers: { Authorization: `Bearer ${adminAuthToken}` },
      data: { email: memberEmail },
    });
    const inviteJson = await inviteResponse.json();
    const activationToken = inviteJson.activation_token;

    // Activate member account
    await setupPage.goto(`/activate-account?token=${activationToken}`);
    await setupPage.getByPlaceholder('Password').fill(memberPassword);
    await setupPage.getByPlaceholder('Confirm Password').fill(memberPassword);
    await setupPage.getByRole('button', { name: 'Activate Account' }).click();
    await expect(setupPage).toHaveURL('/login');

    await setupContext.close();
  });

  test('admin can view users and invite new members', async ({ page }) => {
    // Login as admin
    await login(page, adminEmail, adminPassword);

    // Navigate to settings page
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');
    await expect(page.getByRole('heading', { name: 'Organization Settings' })).toBeVisible();

    // Verify the initial member is visible in the list
    const memberRow = page.getByRole('row', { name: new RegExp(memberEmail) });
    await expect(memberRow).toBeVisible();
    await expect(memberRow.getByText('member', { exact: true })).toBeVisible();
    await expect(memberRow.getByText('active', { exact: true })).toBeVisible();

    // Invite a new user
    const newInviteEmail = `new_invitee_${uniqueId}@lexicontract.ai`;
    await page.getByPlaceholder('new.member@example.com').fill(newInviteEmail);
    await page.getByRole('button', { name: 'Send Invite' }).click();

    // Verify the new invited user appears in the list
    const newInviteRow = page.getByRole('row', { name: new RegExp(newInviteEmail) });
    await expect(newInviteRow).toBeVisible();
    await expect(newInviteRow.getByText('member', { exact: true })).toBeVisible();
    await expect(newInviteRow.getByText('invited', { exact: true })).toBeVisible();
  });

  test('non-admin user is redirected from settings page', async ({ page }) => {
    // Login as member
    await login(page, memberEmail, memberPassword);

    // Member should not see the settings link
    await expect(page.getByRole('link', { name: 'Settings' })).not.toBeVisible();

    // Attempt to navigate directly to the settings page
    await page.goto('/settings');

    // Verify user is redirected to the dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Organization Settings' })).not.toBeVisible();
  });

  test('admin can change a member role to admin', async ({ page, browser }) => {
    // Login as admin
    await login(page, adminEmail, adminPassword);
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');

    // Set up listener for the confirmation dialog BEFORE clicking
    page.on('dialog', dialog => dialog.accept());

    // Find the member row and click the 'Make Admin' button
    const memberRow = page.getByRole('row', { name: new RegExp(memberEmail) });
    await memberRow.getByRole('button', { name: 'Make Admin' }).click();

    // Verify the role in the UI has changed to 'admin'
    await expect(memberRow.getByText('admin')).toBeVisible();

    // Now, verify the promoted user has admin privileges in a new context
    const promotedUserContext = await browser.newContext();
    const promotedUserPage = await promotedUserContext.newPage();
    await login(promotedUserPage, memberEmail, memberPassword);

    // The promoted user should now see the 'Settings' link and be able to access the page
    await expect(promotedUserPage.getByRole('link', { name: 'Settings' })).toBeVisible();
    await promotedUserPage.goto('/settings');
    await expect(promotedUserPage.getByRole('heading', { name: 'Organization Settings' })).toBeVisible();

    await promotedUserContext.close();
  });

  test('admin can remove a user from the organization', async ({ page, request }) => {
    // To keep this test isolated, we'll create a brand new user just for this test.
    const userToRemoveEmail = `remove_me_${uniqueId}@lexicontract.ai`;
    const userToRemovePassword = 'aPasswordToRemove';

    // --- Setup: Invite and activate the user to be removed ---
    const adminTokenResponse = await request.post('http://localhost:8000/api/v1/auth/token', {
      form: { username: adminEmail, password: adminPassword },
    });
    const adminTokenJson = await adminTokenResponse.json();
    const adminAuthToken = adminTokenJson.access_token;

    const inviteResponse = await request.post('http://localhost:8000/api/v1/users/organization/invite', {
      headers: { Authorization: `Bearer ${adminAuthToken}` },
      data: { email: userToRemoveEmail },
    });
    const inviteJson = await inviteResponse.json();
    const activationToken = inviteJson.activation_token;

    await page.goto(`/activate-account?token=${activationToken}`);
    await page.getByPlaceholder('Password').fill(userToRemovePassword);
    await page.getByPlaceholder('Confirm Password').fill(userToRemovePassword);
    await page.getByRole('button', { name: 'Activate Account' }).click();
    await expect(page).toHaveURL('/login');

    // --- Test Execution ---
    await login(page, adminEmail, adminPassword);
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');

    const userToRemoveRow = page.getByRole('row', { name: new RegExp(userToRemoveEmail) });
    await expect(userToRemoveRow).toBeVisible();

    page.on('dialog', dialog => dialog.accept());
    await userToRemoveRow.getByRole('button', { name: 'Remove' }).click();

    await expect(userToRemoveRow).not.toBeVisible();

    // --- Verification: Attempt to log in as the removed user ---
    await page.getByRole('button', { name: 'Logout' }).click();
    await login(page, userToRemoveEmail, userToRemovePassword);
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });
});