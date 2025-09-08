import { Contract, ContractPredictions } from '@/types';

// This is a placeholder for a more complete API library.

export const getContractById = async (contractId: string, token: string): Promise<Contract> => {
  const response = await fetch(`/api/v1/contracts/${contractId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch contract');
  }
  return response.json();
};

export const getContractPredictions = async (contractId: string, token: string): Promise<ContractPredictions> => {
  const response = await fetch(`/api/v1/contracts/${contractId}/predictions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch contract predictions');
  }
  return response.json();
};

export const updateSuggestionStatus = async (
  suggestionId: string,
  status: 'accepted' | 'rejected',
  token: string
): Promise<void> => {
  const response = await fetch(`/api/v1/suggestions/${suggestionId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update suggestion status');
  }
  // No body is returned on success, so we don't need to parse JSON
};
