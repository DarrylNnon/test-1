import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Contract Export Flow', () => {
  const uniqueId = Date.now();
  const userEmail = `exporter_${uniqueId}@lexicontract.ai`;
  const userPassword = 'aSecurePassword123';
  const organizationName = `ExportCorp ${uniqueId}`;
  const contractFixture = path.resolve(__dirname, 'fixtures/test-contract.txt');

  test.beforeAll(async ({ browser }) => {
    // Register a new user for the test suite
    const page = await browser.newPage();
    await page.goto('/register');
    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(userPassword);
    await page.getByPlaceholder('Organization Name').fill(organizationName);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/login');
    await page.close();
  });

  test('should export a contract with accepted and rejected changes applied', async ({ page }) => {
    // --- Login ---
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(userEmail);
    await page.getByPlaceholder('Password').fill(userPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    // --- Upload Contract ---
    await page.setInputFiles('input[type="file"]', contractFixture);
    await page.getByRole('button', { name: 'Upload & Analyze' }).click();

    // --- Wait for analysis and navigate to details ---
    const contractRow = page.getByRole('row', { name: /test-contract.txt/i });
    await expect(contractRow.getByText('Completed')).toBeVisible({ timeout: 10000 });
    await contractRow.click();

    // --- Accept one suggestion and reject another ---
    const suggestionCard1 = page.locator('div', { hasText: 'The typical confidentiality term is 2-3 years.' });
    await suggestionCard1.getByRole('button', { name: 'Accept' }).click();
    await expect(suggestionCard1.getByText('Accepted')).toBeVisible();

    const suggestionCard2 = page.locator('div', { hasText: "Ensure this standard agreement aligns with our company's specific liability caps." });
    await suggestionCard2.getByRole('button', { name: 'Reject' }).click();
    await expect(suggestionCard2.getByText('Rejected')).toBeVisible();

    // --- Export and Verify Content ---
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Redlined Contract' }).click();
    const download = await downloadPromise;

    // Verify the filename
    expect(download.suggestedFilename()).toBe('test-contract_redlined.txt');

    // Read the downloaded file content
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const fileContent = Buffer.concat(chunks).toString('utf-8');

    // --- Define expected content ---
    // The first suggestion (changing "5 years" to "3 years") was accepted.
    // The second suggestion (comment on "standard Non-Disclosure Agreement") was rejected, so no text change occurs.
    const expectedContent = `This is a standard Non-Disclosure Agreement.

The confidentiality term of 3 years is a key part of this agreement.

This document outlines the terms and conditions for all parties involved.
`;

    // Assert the content is correct
    expect(fileContent).toBe(expectedContent);
  });
});