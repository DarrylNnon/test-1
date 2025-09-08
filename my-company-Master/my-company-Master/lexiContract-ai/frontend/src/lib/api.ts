import axios from 'axios';
import { Contract } from '@/types';

// The getBackendUrl function is no longer needed because we are using Next.js rewrites as a proxy.
// All API calls will be made to the Next.js server's relative path, which then proxies them to the backend.

export const api = axios.create({
  // The baseURL is now the relative path that Next.js will intercept and rewrite.
  baseURL: '/api/v1',
});

export const getContracts = async (): Promise<Contract[]> => {
  try {
    const response = await api.get<Contract[]>('/contracts/');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch contracts:', error);
    throw new Error('Failed to fetch contracts');
  }
};

// Add an interceptor to include the auth token in requests if it exists.
api.interceptors.request.use((config) => {
  // The logic for setting baseURL is no longer needed here.

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});