import { test, expect, Page } from '@playwright/test';
import { login, createTestUser, uploadContract } from './utils';
import path from 'path';

test.describe('Advanced Compliance Modules', () => {
  const complianceContractPath = path.join(__dirname, '../../../../test_data', 'compliance_contract.txt')
  let enterpriseUser: { email: any; password: any; };
  let standardUser: { email: any; password: any; };

  test.beforeAll(async () => {
    // Create users once for the entire test suite
    enterpriseUser = await createTestUser('enterprise-compliance');
    standardUser = await createTestUser('standard-compliance');
  });

  test('Enterprise user sees GDPR/CCPA compliance suggestions', async ({ page }) => {
    // Log in as the enterprise user
    await login(page, enterpriseUser.email, enterpriseUser.password);

    // Use the testing endpoint to upgrade the organization to 'enterprise'
    const updateResponse = await page.request.patch('/api/v1/testing/update-subscription', {
      data: {
        plan_id: 'enterprise',
        subscription_status: 'active'
      }
    });
    expect(updateResponse.ok()).toBeTruthy();

    // Upload a contract with compliance-related text
    await uploadContract(page, complianceContractPath);

    // Wait for analysis and navigate to the contract detail page
    await page.getByText('compliance_contract.txt').click();
    await expect(page.getByText('Analysis completed')).toBeVisible({ timeout: 15000 });

    // --- Assertions ---
    // Check for a specific compliance suggestion based on our seeded playbook
    const dataProcessingSuggestion = page.getByTestId('suggestion-card').filter({
      hasText: 'Data Processing Agreement (DPA) Reference'
    });
    await expect(dataProcessingSuggestion).toBeVisible();
    await expect(dataProcessingSuggestion.getByText('Data Privacy')).toBeVisible();
    await expect(dataProcessingSuggestion.getByText('Flags any mention of a Data Processing Agreement or Addendum.')).toBeVisible();

    // Check for another compliance suggestion
    const dataBreachSuggestion = page.getByTestId('suggestion-card').filter({
      hasText: 'Data Breach Notification'
    });
    await expect(dataBreachSuggestion).toBeVisible();
    await expect(dataBreachSuggestion.getByText('Security')).toBeVisible();
  });

  test('Standard user does NOT see GDPR/CCPA compliance suggestions', async ({ page }) => {
    // Log in as the standard user (default plan is not enterprise)
    await login(page, standardUser.email, standardUser.password);

    // Upload the same contract
    await uploadContract(page, complianceContractPath);

    // Wait for analysis and navigate to the contract detail page
    await page.getByText('compliance_contract.txt').click();
    await expect(page.getByText('Analysis completed')).toBeVisible({ timeout: 15000 });

    // --- Assertions ---
    // Assert that compliance-specific suggestions are NOT visible
    const dataProcessingSuggestion = page.getByTestId('suggestion-card').filter({
      hasText: 'Data Processing Agreement (DPA) Reference'
    });
    await expect(dataProcessingSuggestion).not.toBeVisible();

    const dataBreachSuggestion = page.getByTestId('suggestion-card').filter({
      hasText: 'Data Breach Notification'
    });
    await expect(dataBreachSuggestion).not.toBeVisible();

    // Assert that a standard AI suggestion IS still visible
    const standardSuggestion = page.getByTestId('suggestion-card').filter({ hasText: 'Unfavorable Terms' });
    await expect(standardSuggestion).toBeVisible();
  });
});