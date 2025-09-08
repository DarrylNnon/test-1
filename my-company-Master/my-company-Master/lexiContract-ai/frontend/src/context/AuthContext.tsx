'use client';

import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { User, UserWithOrg } from '@/types';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: UserWithOrg | null; // The currently logged-in user
  token: string | null; // The JWT for API requests
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserWithOrg | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        try {
          setToken(storedToken);
          const response = await api.get('/users/me');
          setUser(response.data);
        } catch (error) {
          console.error('Token validation failed', error);
          localStorage.removeItem('accessToken');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    validateToken();
  }, []); // Run only on initial mount

  const login = async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    const response = await api.post('/auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const { access_token } = response.data;
    localStorage.setItem('accessToken', access_token);
    setToken(access_token);
    const userResponse = await api.get('/users/me');
    setUser(userResponse.data);
    router.push('/');
  };

  const register = async (data: any) => {
    await api.post('/auth/register', data);
    await login(data.email, data.password);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const value: AuthContextType = {
    isAuthenticated: !!user,
    user,
    token,
    login,
    register,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};