import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import api from '@/services/api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  signup: (name: string, email: string, password: string, role: UserRole, branchId?: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored token on mount
  useEffect(() => {
    const checkToken = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      
      // Clear any existing invalid tokens on startup
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      api.clearToken();
      
      setIsLoading(false);
    };
    
    checkToken();
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      // Call real backend API for login
      const { user: loggedInUser, token } = await api.login(email, password);
      
      // Store token in localStorage
      localStorage.setItem(TOKEN_KEY, token);
      
      // Set token on API service immediately
      api.setToken(token);
      
      // Map backend user to frontend User type
      const user: User = {
        id: loggedInUser.id,
        name: loggedInUser.name || loggedInUser.email?.split('@')[0] || 'User',
        email: loggedInUser.email,
        role: loggedInUser.role as UserRole,
        branchId: loggedInUser.branch_id,
        avatar: loggedInUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        status: 'online',
      };
      
      // Store user in localStorage
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      setUser(user);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string, role: UserRole, branchId?: string): Promise<boolean> => {
    try {
      // Call real backend API for signup
      const { user: newUser, token } = await api.signup(name, email, password, role, branchId);

      // Store token in localStorage
      localStorage.setItem(TOKEN_KEY, token);
      
      // Set token on API service immediately
      api.setToken(token);
      
      // Map backend user to frontend User type
      const user: User = {
        id: newUser.id,
        name: newUser.name || newUser.email?.split('@')[0] || 'User',
        email: newUser.email,
        role: newUser.role as UserRole,
        branchId: newUser.branch_id,
        avatar: newUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        status: 'online',
      };
      
      // Store user in localStorage
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      setUser(user);
      return true;
    } catch (error) {
      console.error('Signup failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (prev) {
        const updated = { ...prev, ...updates };
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        return updated;
      }
      return null;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
