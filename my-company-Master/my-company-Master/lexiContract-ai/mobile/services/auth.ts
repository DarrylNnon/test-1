import * as SecureStore from 'expo-secure-store';

// NOTE: In a real application, this URL should come from environment variables.
const API_URL = 'http://localhost:8000/api/v1';
const TOKEN_KEY = 'lexicontract_auth_token';

/**
 * Logs in the user by calling the backend token endpoint.
 * @param email The user's email.
 * @param password The user's password.
 * @returns The token data from the API.
 */
export async function login(email, password) {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch(`${API_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(errorData.detail || 'Login failed');
  }

  const data = await response.json();
  // Securely store the received token
  await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
  return data;
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
