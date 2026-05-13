import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { apiService } from "@/lib/api";

type UserRole = "candidate" | "employer" | "admin";

interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  specialty?: string;
  experience?: string;
  city?: string;
  company?: string;
  aiScore?: number;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    extra?: Record<string, unknown>
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const token = apiService.getToken();
    if (token) {
      try {
        const data = await apiService.getProfile();
        setUser(data.user);
      } catch {
        apiService.clearToken();
        setUser(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiService.login(email, password);
    setUser(data.user);
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    extra?: Record<string, unknown>
  ) => {
    await apiService.signup(email, password, name, role, extra);
    await login(email, password);
  };

  const logout = () => {
    apiService.clearToken();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await apiService.getProfile();
      setUser(data.user);
    } catch {
      // silently fail
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoggedIn: !!user, loading, login, signup, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
