import { test, expect } from '@playwright/test';
import { login, createTestUser } from './utils';

test.describe('Compliance Insights Dashboard', () => {
  let enterpriseAdmin: { email: any; password: any; };

  test.beforeAll(async () => {
    // Create an enterprise admin user for the tests
    enterpriseAdmin = await createTestUser('dashboard-admin', true);
  });

  test('displays compliance data correctly for an enterprise admin', async ({ page }) => {
    // Mock the API response for the dashboard data to ensure a consistent test
    await page.route('/api/v1/compliance-analytics/summary', async route => {
      const json = {
        findings_by_category: [
          { category: 'HIPAA', count: 42 },
          { category: 'Data Privacy', count: 25 },
          { category: 'FAR', count: 12 },
        ],
        top_flagged_contracts: [
          { contract_id: 'a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6', filename: 'MSA_Vendor_A.pdf', finding_count: 8 },
          { contract_id: 'b2c3d4e5-f6a7-b8c9-d0e1-f2a3b4c5d6e7', filename: 'BAA_Partner_B.pdf', finding_count: 6 },
        ],
      };
      await route.fulfill({ json });
    });

    // Log in as the enterprise admin
    await login(page, enterpriseAdmin.email, enterpriseAdmin.password);

    // Navigate to the new compliance dashboard page
    await page.goto('/dashboard/compliance');

    // --- Assertions ---

    // Check that the main page title is visible
    await expect(page.getByRole('heading', { name: 'Compliance Insights' })).toBeVisible();

    // Check that the bar chart component has rendered
    await expect(page.getByText('Findings by Risk Category')).toBeVisible();
    // Check for a specific bar in the chart (Recharts renders text nodes for labels)
    await expect(page.getByText('HIPAA')).toBeVisible();

    // Check that the table component has rendered
    await expect(page.getByText('Top Flagged Contracts')).toBeVisible();
    // Check for a specific row in the table
    const vendorARow = page.getByRole('row', { name: 'MSA_Vendor_A.pdf 8 View' });
    await expect(vendorARow).toBeVisible();
    await expect(vendorARow.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/dashboard/contracts/a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6');
  });
});