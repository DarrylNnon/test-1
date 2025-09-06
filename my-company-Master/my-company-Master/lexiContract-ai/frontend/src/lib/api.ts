import axios from 'axios';

const getBackendUrl = () => {
  // This function determines the backend URL based on the environment.
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.app.github.dev')) {
    // We are in a GitHub Codespace. Construct the backend URL dynamically.
    // The backend is on port 8000, and the frontend is on 3000.
    return `https://${window.location.hostname.replace('-3000', '-8000')}`;
  }
  
  // For local development or other environments, use the environment variable or a default.
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const backendUrl = getBackendUrl();

export const api = axios.create({
  baseURL: `${backendUrl}/api/v1`,
});

// Add an interceptor to include the auth token in requests if it exists.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});