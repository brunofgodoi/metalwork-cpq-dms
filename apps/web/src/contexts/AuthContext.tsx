import { createContext, useContext, useState, type ReactNode } from 'react';

export type Role = 'ADMIN' | 'ESTIMATOR' | 'VIEWER';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  changePasswordNextLogin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('@cpq:user');
    if (storedUser) return JSON.parse(storedUser);
    return null;
  });

  const login = (token: string, userData: User) => {
    localStorage.setItem('@cpq:token', token);
    localStorage.setItem('@cpq:user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('@cpq:token');
    localStorage.removeItem('@cpq:user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
