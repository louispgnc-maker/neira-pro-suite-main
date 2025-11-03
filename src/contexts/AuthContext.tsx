import { createContext, useContext, useState, ReactNode } from 'react';

// Types
interface User {
  firstName: string;
  lastName: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string) => boolean;
  register: (email: string, firstName: string, lastName: string) => void;
  logout: () => void;
}

// Local Storage helpers
const USERS_STORAGE_KEY = 'neira_users';

const getStoredUsers = (): Record<string, User> => {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    return {};
  }
};

const saveUsers = (users: Record<string, User>) => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Erreur de sauvegarde:', error);
  }
};

// Context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Record<string, User>>(getStoredUsers());

  const register = (email: string, firstName: string, lastName: string) => {
    const newUser = { email, firstName, lastName };
    const updatedUsers = { ...users, [email]: newUser };
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setUser(newUser);
  };

  const login = (email: string): boolean => {
    const foundUser = users[email];
    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, register, login, logout }}>
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