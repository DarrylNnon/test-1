import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should allow a user to register, log in, and see the dashboard', async ({ page }) => {
    // Use a unique email for each test run to avoid conflicts
    const uniqueId = Date.now();
    const userEmail = `testuser_${uniqueId}@lexicontract.ai`;
    const userPassword = 'aSecurePassword123';
    const organizationName = `TestCorp ${uniqueId}`;

    // --- Registration ---
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(userPassword);
    await page.getByPlaceholder('Organization Name').fill(organizationName);
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Assert that we are redirected to the login page after registration
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Registration successful! Please log in.')).toBeVisible();

    // --- Login ---
    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(userPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Assert that we are redirected to the dashboard
    await expect(page).toHaveURL('/');
    // The main page shows the contract list, which has this heading.
    await expect(page.getByRole('heading', { name: 'Your Contracts' })).toBeVisible();
  });
});