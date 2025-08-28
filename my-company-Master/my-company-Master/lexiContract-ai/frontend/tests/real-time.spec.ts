import { test, expect, Page } from '@playwright/test';
import path from 'path';

test.describe('Real-Time Collaboration', () => {
  const uniqueId = Date.now();
  const adminEmail = `rt_admin_${uniqueId}@lexicontract.ai`;
  const adminPassword = 'aSecurePassword123';
  const orgName = `RealTimeCorp ${uniqueId}`;
  const collaboratorEmail = `rt_collab_${uniqueId}@lexicontract.ai`;
  const collaboratorPassword = 'aCollaboratorPassword456';
  // Assumes a fixtures directory exists inside the /tests directory
  const contractFixture = path.resolve(__dirname, 'fixtures/test-contract.txt');

  let contractUrl: string;

  // Helper function to log in a user in a given context
  const login = async (page: Page, email: string, password: string) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');
  };

  test.beforeAll(async ({ browser, request }) => {
    // --- 1. Register Admin, Upload Contract, and Invite Collaborator ---
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
    // This assumes a fixture file exists at 'frontend/tests/fixtures/test-contract.txt'
    await setupPage.setInputFiles('input[type="file"]', contractFixture);
    await setupPage.getByRole('button', { name: 'Upload & Analyze' }).click();
    const contractRow = setupPage.getByRole('row', { name: /test-contract.txt/i });
    await expect(contractRow.getByText('Completed')).toBeVisible({ timeout: 15000 });
    await contractRow.click();
    await expect(setupPage.getByRole('heading', { name: 'Activity Feed' })).toBeVisible();
    contractUrl = setupPage.url(); // Save the contract URL for other contexts

    // Get admin auth token for API calls
    const tokenResponse = await request.post('http://localhost:8000/api/v1/auth/token', {
      form: { username: adminEmail, password: adminPassword },
    });
    const tokenJson = await tokenResponse.json();
    const adminAuthToken = tokenJson.access_token;

    // Invite collaborator via API to get activation token
    const inviteResponse = await request.post('http://localhost:8000/api/v1/users/organization/invite', {
      headers: { Authorization: `Bearer ${adminAuthToken}` },
      data: { email: collaboratorEmail },
    });
    const inviteJson = await inviteResponse.json();
    const activationToken = inviteJson.activation_token;

    // Activate collaborator account
    await setupPage.goto(`/activate-account?token=${activationToken}`);
    await setupPage.getByPlaceholder('Password').fill(collaboratorPassword);
    await setupPage.getByPlaceholder('Confirm Password').fill(collaboratorPassword);
    await setupPage.getByRole('button', { name: 'Activate Account' }).click();
    await expect(setupPage).toHaveURL('/login');

    await setupContext.close();
  });

  test('should show updates in real-time across different user sessions', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const collaboratorContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const collaboratorPage = await collaboratorContext.newPage();

    // Both users log in and navigate to the same contract
    await Promise.all([ login(adminPage, adminEmail, adminPassword), login(collaboratorPage, collaboratorEmail, collaboratorPassword) ]);
    await Promise.all([ adminPage.goto(contractUrl), collaboratorPage.goto(contractUrl) ]);

    // Admin adds a comment
    const newCommentText = `This is a real-time test comment from the admin at ${uniqueId}.`;
    await adminPage.getByPlaceholder('Type your comment here...').fill(newCommentText);
    await adminPage.getByRole('button', { name: 'Submit Comment' }).click();

    // Verify the comment appears on the collaborator's page instantly
    await expect(collaboratorPage.locator('div', { hasText: newCommentText })).toBeVisible({ timeout: 5000 });

    // Collaborator accepts a suggestion
    const suggestionText = 'The typical confidentiality term is 2-3 years.';
    const collaboratorSuggestionCard = collaboratorPage.locator('div', { hasText: suggestionText });
    await collaboratorSuggestionCard.getByRole('button', { name: 'Accept' }).click();

    // Verify the suggestion status updates on the admin's page instantly
    const adminSuggestionCard = adminPage.locator('div', { hasText: suggestionText });
    await expect(adminSuggestionCard.getByText('Accepted')).toBeVisible({ timeout: 5000 });

    await adminContext.close();
    await collaboratorContext.close();
  });
});