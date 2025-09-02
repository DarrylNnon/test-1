import { Page, expect } from '@playwright/test';
import { randomBytes } from 'crypto';

const API_BASE_URL = 'http://localhost:8000';
const FRONTEND_BASE_URL = 'http://localhost:3000';

/**
 * Creates a new user for testing purposes via a dedicated API endpoint.
 * @param prefix - A prefix for the user's email to keep it unique.
 * @returns An object containing the user's email and password.
 */
export async function createTestUser(prefix: string) {
  const randomString = randomBytes(8).toString('hex');
  const email = `${prefix}-${randomString}@example.com`;
  const password = 'password123';
  const organizationName = `org-${randomString}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/testing/create-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      organization_name: organizationName,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create test user: ${response.status} ${errorBody}`);
  }

  return { email, password };
}

/**
 * Logs a user into the application.
 * @param page - The Playwright Page object.
 * @param email - The user's email.
 * @param password - The user's password.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto(`${FRONTEND_BASE_URL}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(`${FRONTEND_BASE_URL}/dashboard`);
}

/**
 * Uploads a contract file from the dashboard.
 * @param page - The Playwright Page object.
 * @param filePath - The absolute path to the contract file to upload.
 */
export async function uploadContract(page: Page, filePath: string) {
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload Contract' }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
  await expect(page.getByText('Upload successful')).toBeVisible({ timeout: 10000 });
}