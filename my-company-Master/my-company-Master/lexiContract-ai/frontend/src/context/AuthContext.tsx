"use client";

import { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { UserWithOrg } from '@/types';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: UserWithOrg | null;
  login: (data: FormData) => Promise<void>;
  register: (data: object) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserWithOrg | null>(null);
  const [token, setToken] = useState<string | null>(() => Cookies.get('token') || null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/users/me')
        .then(response => setUser(response.data))
        .catch(() => {
          Cookies.remove('token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      delete api.defaults.headers.common['Authorization'];
      setLoading(false);
    }
  }, []);

  const login = async (data: FormData) => {
    const response = await api.post('/auth/token', data);
    const { access_token } = response.data;
    Cookies.set('token', access_token, { expires: 1 });
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setToken(access_token);
    const userResponse = await api.get('/users/me');
    setUser(userResponse.data);
    router.push('/');
  };

  const register = async (data: object) => {
    await api.post('/auth/register', data);
    router.push('/login');
  };

  const logout = () => {
    Cookies.remove('token');
    setUser(null);
    setToken(null);
    delete api.defaults.headers.common['Authorization'];
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, token, user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};