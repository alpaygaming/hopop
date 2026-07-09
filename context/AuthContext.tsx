import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { RegisteredUser, UserRole } from '@/types';
import { ProfileService } from '@/services/api';

interface AuthContextType {
  user: RegisteredUser | null;
  role: UserRole;
  currentUsername: string | null;
  isLoading: boolean;
  login: (username: string, userData: RegisteredUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<RegisteredUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<RegisteredUser | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUsername = await AsyncStorage.getItem('currentUsername');
      if (storedUsername) {
        const storedUsers = await AsyncStorage.getItem('registeredUsers');
        if (storedUsers) {
          const parsedUsers = JSON.parse(storedUsers);
          if (parsedUsers[storedUsername]) {
            setUser(parsedUsers[storedUsername]);
            setRole(parsedUsers[storedUsername].role);
            setCurrentUsername(storedUsername);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load user', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, userData: RegisteredUser) => {
    setUser(userData);
    setRole(userData.role);
    setCurrentUsername(username);
    await AsyncStorage.setItem('currentUsername', username);
  };

  const logout = async () => {
    setUser(null);
    setRole(null);
    setCurrentUsername(null);
    await AsyncStorage.removeItem('currentUsername');
  };

  const updateUser = (data: Partial<RegisteredUser>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ user, role, currentUsername, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
