"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());
    try {
      await register(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">Create your account</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            sign in to an existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1"><input id="email" name="email" type="email" autoComplete="email" required className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" /></div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1"><input id="password" name="password" type="password" autoComplete="new-password" required className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" /></div>
            </div>
            <div>
              <label htmlFor="organization_name" className="block text-sm font-medium text-gray-700">Organization Name</label>
              <div className="mt-1"><input id="organization_name" name="organization_name" type="text" required className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" /></div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <button type="submit" className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Create Account</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}