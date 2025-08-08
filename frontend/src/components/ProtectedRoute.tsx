import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode; allow?: Array<'STUDENT'|'FACULTY'|'ADMIN'> }>=({ children, allow })=>{
  const { user, token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (allow && user && !allow.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};
