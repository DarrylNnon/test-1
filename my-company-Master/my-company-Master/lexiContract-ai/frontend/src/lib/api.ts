import axios from 'axios';
import Cookies from 'js-cookie';
import { ComplianceHubSummary } from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  // Only set the header if it's not already set (to avoid overriding token from server components)
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getComplianceHubSummary = async (token: string): Promise<ComplianceHubSummary> => {
  const response = await api.get('/compliance/summary', {
    headers: {
      // Pass token explicitly for server-side calls
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export default api;