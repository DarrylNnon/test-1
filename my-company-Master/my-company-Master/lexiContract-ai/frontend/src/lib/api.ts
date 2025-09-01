import axios from 'axios';
import { ApiKey, NewApiKeyResponse, Contract, Signer, SearchResult, ComplianceHubSummary } from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
});

export const listApiKeys = async (token: string): Promise<ApiKey[]> => {
  const response = await api.get('/api-keys/', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createApiKey = async (data: { name: string }, token: string): Promise<NewApiKeyResponse> => {
  const response = await api.post('/api-keys/', data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const revokeApiKey = async (keyId: string, token: string): Promise<void> => {
  await api.delete(`/api-keys/${keyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const initiateSignature = async (contractId: string, data: { signers: Omit<Signer, 'id' | 'status'>[], email_subject: string, email_body: string }, token: string): Promise<Contract> => {
  const response = await api.post(`/contracts/${contractId}/signature/initiate`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getSigningUrl = async (contractId: string, token: string): Promise<{ signing_url: string }> => {
  const response = await api.get(`/contracts/${contractId}/signature/view`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const generateClause = async (prompt: string, token: string): Promise<string> => {
  const response = await api.post(
    '/drafting/generate-clause',
    { prompt },
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'text', // Expect plain text back
    }
  );
  return response.data;
};

export const search = async (query: string, token: string): Promise<{ data: SearchResult[] }> => {
  const response = await api.get('/search/', {
    params: { q: query },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response; // axios wraps response in a data object
};

export const getComplianceHubSummary = async (token: string): Promise<ComplianceHubSummary> => {
  const response = await api.get('/compliance/hub-summary', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};