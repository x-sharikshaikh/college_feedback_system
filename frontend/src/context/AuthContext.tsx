import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

export type User = { id: string; email: string; name: string; role: 'STUDENT' | 'FACULTY' | 'ADMIN' };

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; confirmPassword?: string; name: string; role?: User['role'] }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const Ctx = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(false);

  const refreshMe = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (token) refreshMe();
  }, [token, refreshMe]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
  const res = await api.post('/api/auth/login', { email: email.trim().toLowerCase(), password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: { email: string; password: string; confirmPassword?: string; name: string; role?: User['role'] }) => {
    setLoading(true);
    try {
  const res = await api.post('/api/auth/register', { ...payload, email: payload.email.trim().toLowerCase() });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, token, loading, login, register, logout, refreshMe }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
