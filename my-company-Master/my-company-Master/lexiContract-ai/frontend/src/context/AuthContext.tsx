'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { User, UserWithOrg } from '@/types';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: UserWithOrg | null; // The currently logged-in user
  token: string | null; // The JWT for API requests
  login: (formData: FormData) => Promise<void>;
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
      const cookieToken = Cookies.get('token');
      if (cookieToken) {
        try {
          setToken(cookieToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${cookieToken}`;
          const response = await api.get('/users/me');
          setUser(response.data);
        } catch (error) {
          console.error('Token validation failed', error);
          Cookies.remove('token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    validateToken();
  }, []); // Run only on initial mount

  const login = async (formData: FormData) => {
    const response = await api.post('/auth/token', formData);
    const { access_token } = response.data;
    Cookies.set('token', access_token, { expires: 1 });
    setToken(access_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    const userResponse = await api.get('/users/me');
    setUser(userResponse.data);
    router.push('/');
  };

  const register = async (data: any) => {
    // Use the correct registration endpoint
    await api.post('/auth/register', data);
    const formData = new FormData();
    formData.append('username', data.email);
    formData.append('password', data.password);
    await login(formData);
  };

  const logout = () => {
    Cookies.remove('token');
    setToken(null);
    delete api.defaults.headers.common['Authorization'];
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