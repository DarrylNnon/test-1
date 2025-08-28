import { test, expect, Page } from '@playwright/test';

test.describe('Password Reset Flow', () => {
  const uniqueId = Date.now();
  const userEmail = `reset_user_${uniqueId}@lexicontract.ai`;
  const initialPassword = 'anInitialPassword123';
  const newPassword = 'aNewSecurePassword456';
  const orgName = `ResetCorp ${uniqueId}`;

  // Register the user before running tests
  test.beforeAll(async ({ request }) => {
    const response = await request.post('http://localhost:8000/api/v1/auth/register', {
      data: {
        email: userEmail,
        password: initialPassword,
        organization_name: orgName,
      },
    });
    expect(response.ok()).toBeTruthy();
  });

  test('should allow a user to reset their password', async ({ page }) => {
    // 1. Go to forgot password page
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();

    // 2. Request a reset link and capture the token from the response
    const resetPromise = page.waitForResponse(resp => resp.url().includes('/forgot-password'));
    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByRole('button', { name: 'Send Reset Link' }).click();

    const resetResponse = await resetPromise;
    const resetJson = await resetResponse.json();
    const resetToken = resetJson.reset_token;
    expect(resetToken).toBeDefined();
    expect(resetToken).not.toBeNull();

    // 3. Navigate to the reset password page with the token
    await page.goto(`/reset-password?token=${resetToken}`);
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();

    // 4. Fill in the new password and submit
    await page.getByLabel('New Password').fill(newPassword);
    await page.getByLabel('Confirm New Password').fill(newPassword);
    await page.getByRole('button', { name: 'Reset Password' }).click();

    // 5. Verify success message and redirection
    await expect(page.getByText('Your password has been reset successfully. Redirecting to login...')).toBeVisible();
    await expect(page).toHaveURL('/login', { timeout: 5000 });

    // 6. Log in with the new password
    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByText(userEmail)).toBeVisible();
  });
});