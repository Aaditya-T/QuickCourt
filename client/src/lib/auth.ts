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
    const initializeAuth = async () => {
      try {
        const savedToken = localStorage.getItem("quickcourt_token");
        const savedUser = localStorage.getItem("quickcourt_user");
        
        console.log("Auth initialization - savedToken:", !!savedToken, "savedUser:", !!savedUser);
        
        if (savedToken && savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            console.log("Parsed user data:", parsedUser);
            
            // Validate that the parsed user has required fields
            if (parsedUser && parsedUser.id && parsedUser.email) {
              setToken(savedToken);
              setUser(parsedUser);
              console.log("Auth state restored successfully");
              
              // Validate token by making a request to the server
              try {
                const response = await fetch("/api/users/me", {
                  headers: {
                    Authorization: `Bearer ${savedToken}`,
                  },
                });
                
                if (response.ok) {
                  const freshUserData = await response.json();
                  // Update with fresh data from server
                  setUser(freshUserData);
                  localStorage.setItem("quickcourt_user", JSON.stringify(freshUserData));
                  console.log("Token validated and user data refreshed");
                } else {
                  console.warn("Token validation failed, clearing auth state");
                  // Clear auth state manually to avoid dependency issues
                  setUser(null);
                  setToken(null);
                  localStorage.removeItem("quickcourt_token");
                  localStorage.removeItem("quickcourt_user");
                }
              } catch (error) {
                console.error("Error validating token:", error);
                // Don't clear auth state on network errors, just log
              }
            } else {
              console.warn("Parsed user data is incomplete, clearing auth state");
              localStorage.removeItem("quickcourt_token");
              localStorage.removeItem("quickcourt_user");
            }
          } catch (error) {
            console.error("Error parsing saved user data:", error);
            // Clear corrupted data
            localStorage.removeItem("quickcourt_token");
            localStorage.removeItem("quickcourt_user");
          }
        } else {
          console.log("No saved auth data found");
        }
      } catch (error) {
        console.error("Error during auth initialization:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []); // Empty dependency array since we don't want to re-run this on every render

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

  const refreshUser = async () => {
    if (!token) return;
    
    try {
      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem("quickcourt_user", JSON.stringify(userData));
        console.log("User data refreshed from server");
      } else {
        console.warn("Failed to refresh user data, token may be invalid");
        // Token might be expired, clear auth state
        logout();
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  return {
    user,
    token,
    setUser,
    login,
    register,
    logout,
    refreshUser,
    isLoading,
  };
};

export { AuthContext };
