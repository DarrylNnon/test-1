'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { UserWithOrg } from '@/types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserWithOrg | null;
  login: (formData: FormData) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserWithOrg | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const validateToken = async () => {
      const token = Cookies.get('token');
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/users/me');
          setUser(response.data);
        } catch (error) {
          console.error('Token validation failed', error);
          Cookies.remove('token');
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    validateToken();
  }, []);

  const login = async (formData: FormData) => {
    const response = await api.post('/auth/token', formData);
    const { access_token } = response.data;
    Cookies.set('token', access_token, { expires: 1 });
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    const userResponse = await api.get('/users/me');
    setUser(userResponse.data);
    router.push('/dashboard');
  };

  const register = async (data: any) => {
    await api.post('/users/', data);
    const formData = new FormData();
    formData.append('username', data.email);
    formData.append('password', data.password);
    await login(formData);
  };

  const logout = () => {
    Cookies.remove('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    router.push('/login');
  };

  const value = {
    isAuthenticated: !!user,
    user,
    login,
    register,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};