import Header from '@/components/Header';
import DashboardClient from '@/components/dashboard/DashboardClient';

export default function DashboardPage() {
  return (
    <div className="bg-gray-100 min-h-screen">
      <Header />
      <DashboardClient />
    </div>
  );
}