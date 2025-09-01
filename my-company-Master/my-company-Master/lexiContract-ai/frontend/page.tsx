'use client';

import SearchClient from '@/components/SearchClient';
import { Suspense } from 'react';

// Use Suspense to handle the client component's use of searchParams
// This is the recommended pattern in Next.js App Router
export default function SearchPage() {
  return (
    <Suspense>
      <SearchClient />
    </Suspense>
  );
}