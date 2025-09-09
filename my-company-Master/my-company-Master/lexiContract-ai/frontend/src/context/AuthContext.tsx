'use client';

import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { UserWithOrg, Role, Organization } from '@/types';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: UserWithOrg | null; // The currently logged-in user
  token: string | null; // The JWT for API requests
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null; // Add error state
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserWithOrg | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // --- AUTHENTICATION DISABLED FOR DEVELOPMENT ---
  useEffect(() => {
    const mockAuthentication = () => {
      console.warn("Authentication is currently disabled for development purposes.");
      const mockOrg: Organization = {
        id: 'a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6',
        name: 'MockDev Corp',
        enabled_playbooks: [],
      };
      const mockUser: UserWithOrg = {
        id: 'f1e2d3c4-b5a6-f7e8-d9c0-b1a2f3e4d5c7',
        email: 'dev.user@example.com',
        organization_id: mockOrg.id,
        role: Role.Admin,
        is_active: true,
        organization: mockOrg,
      };
      setUser(mockUser);
      setToken('mock-development-token');
      setLoading(false);
    };
    mockAuthentication();
  }, []); // Run only on initial mount

  const login = async (email: string, password: string) => {
    console.log("Login function is disabled during development mode.");
    return Promise.resolve();
  };

  const register = async (data: any) => {
    console.log("Register function is disabled during development mode.");
    return Promise.resolve();
  };

  const logout = () => {
    console.log("Logout function is disabled during development mode.");
  };

  const value: AuthContextType = {
    isAuthenticated: true, // Always true in dev mode
    user,
    token,
    login,
    register,
    logout,
    loading,
    error: null, // Provide a null error state in dev mode
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