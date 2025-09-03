import AnalyticsClient from '@/components/AnalyticsClient';

export default function AnalyticsPage() {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics Dashboard</h1>
      <AnalyticsClient />
    </div>
  );
}