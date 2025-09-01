import { getComplianceHubSummary } from '@/lib/api';
import ComplianceHubDashboard from '@/components/ComplianceHubDashboard';
import { cookies } from 'next/headers';
import { ComplianceHubSummary } from '@/types';

async function fetchSummary(): Promise<ComplianceHubSummary | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    // In a real app, you might redirect to login here
    return null;
  }
  try {
    return await getComplianceHubSummary(token);
  } catch (error) {
    console.error("Failed to fetch compliance summary:", error);
    return null;
  }
}

export default async function CompliancePage() {
  const summaryData = await fetchSummary();

  if (!summaryData) {
    // Handle case where data could not be fetched (e.g., auth error, API down)
    return <div className="p-8 text-center text-red-500">Could not load compliance data. Please ensure you are logged in as an administrator.</div>;
  }

  return <ComplianceHubDashboard summary={summaryData} />;
}