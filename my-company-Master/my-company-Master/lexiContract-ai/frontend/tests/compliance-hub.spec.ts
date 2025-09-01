import { test, expect, Page } from '@playwright/test';

const adminUser = { email: 'admin@example.com', password: 'password123' };

async function login(page: Page, user: { email: string, password: string }) {
  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
}

test.describe('Compliance & Audit Hub Workflow', () => {

  test('admin user can view the compliance hub and its widgets', async ({ page }) => {
    await login(page, adminUser);

    // Navigate to the new compliance hub page
    await page.goto('/compliance');

    // Verify the main page title is visible
    await expect(page.locator('h1:has-text("Compliance & Audit Hub")')).toBeVisible();

    // Verify the playbook widget is rendered
    await expect(page.locator('h3:has-text("Compliance Playbooks")')).toBeVisible();

    // Verify the access policy widget is rendered
    await expect(page.locator('h3:has-text("Access Policies")')).toBeVisible();

    // Verify the audit log widget is rendered and contains some expected text
    await expect(page.locator('h3:has-text("Recent Activity")')).toBeVisible();
    await expect(page.locator('p:has-text("user.login")')).toBeVisible(); // Assuming a login event is in the recent logs
  });
});