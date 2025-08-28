'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';

const navigation = [
  { name: 'Billing', href: '/settings/billing' },
  { name: 'Integrations', href: '/settings/integrations' },
  { name: 'Audit Log', href: '/settings/audit' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
          <aside className="py-6 px-2 sm:px-6 lg:col-span-3 lg:py-0 lg:px-0">
            <nav className="space-y-1">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href} className={classNames(pathname === item.href ? 'bg-gray-50 text-indigo-700 hover:text-indigo-700 hover:bg-white' : 'text-gray-900 hover:text-gray-900 hover:bg-gray-50', 'group rounded-md px-3 py-2 flex items-center text-sm font-medium')}>
                  <span className="truncate">{item.name}</span>
                </Link>
              ))}
            </nav>
          </aside>
          <div className="space-y-6 sm:px-6 lg:col-span-9 lg:px-0">{children}</div>
        </div>
      </main>
    </div>
  );
}