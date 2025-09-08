import React from 'react';
import Link from 'next/link';

// A simple sidebar component
const Sidebar = () => {
  const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Analytics', href: '/dashboard/analytics' },
    { name: 'Templates', href: '/dashboard/templates' },
    { name: 'Drafting', href: '/dashboard/drafting' },
    { name: 'Clause Library', href: '/dashboard/clauses' },
    { name: 'Contracts', href: '/contracts' },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-gray-800 text-white p-4">
      <h2 className="text-2xl font-bold mb-6">LexiContract</h2>
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.name} className="mb-2">
              <Link href={item.href} className="block p-2 rounded hover:bg-gray-700 transition-colors duration-200">
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}