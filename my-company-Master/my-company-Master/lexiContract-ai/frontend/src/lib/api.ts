import axios from 'axios';
import { Contract, AnalyticsData, Clause, ClausePayload } from '@/types';

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

export const getContractById = async (contractId: string): Promise<Contract> => {
  try {
    // The Contract type on the frontend already includes versions, so this should match.
    const response = await api.get<Contract>(`/contracts/${contractId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch contract ${contractId}:`, error);
    throw new Error('Failed to fetch contract details');
  }
};

export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  try {
    const response = await api.get<AnalyticsData>('/analytics/dashboard');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch analytics data:', error);
    throw new Error('Failed to fetch analytics data');
  }
};

export const getClauses = async (): Promise<Clause[]> => {
  try {
    const response = await api.get<Clause[]>('/clauses/');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch clauses:', error);
    throw new Error('Failed to fetch clauses');
  }
};

export const createClause = async (payload: ClausePayload): Promise<Clause> => {
  try {
    const response = await api.post<Clause>('/clauses/', payload);
    return response.data;
  } catch (error) {
    console.error('Failed to create clause:', error);
    throw new Error('Failed to create clause');
  }
};

export const deleteClause = async (clauseId: string): Promise<void> => {
  try {
    await api.delete(`/clauses/${clauseId}`);
  } catch (error) {
    console.error('Failed to delete clause:', error);
    throw new Error('Failed to delete clause');
  }
};

export const uploadContract = async (file: File): Promise<Contract> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post<Contract>('/contracts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to upload contract:', error);
    throw new Error('Failed to upload contract');
  }
};

export const generateClause = async (prompt: string, token: string): Promise<string> => {
  try {
    const response = await api.post<{ generated_text: string }>(
      '/ai/generate-clause',
      { prompt },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.generated_text;
  } catch (error) {
    console.error('Failed to generate clause:', error);
    // Propagate a more specific error message if available
    const apiError = (error as any).response?.data?.detail || 'Failed to generate clause';
    throw new Error(apiError);
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