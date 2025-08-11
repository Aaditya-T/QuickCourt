import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "./queryClient";
import { AuthContextType, AuthUser, RegisterData } from "@/types";

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("quickcourt_token");
    const savedUser = localStorage.getItem("quickcourt_user");
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRequest("/api/auth/login", "POST", { email, password });
      const data = await response.json();
      
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("quickcourt_token", data.token);
      localStorage.setItem("quickcourt_user", JSON.stringify(data.user));
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await apiRequest("/api/auth/register", "POST", userData);
      const data = await response.json();
      
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("quickcourt_token", data.token);
      localStorage.setItem("quickcourt_user", JSON.stringify(data.user));
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("quickcourt_token");
    localStorage.removeItem("quickcourt_user");
  };

  return {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
  };
};

export { AuthContext };
