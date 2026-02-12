import React, { createContext, useContext, useState, useEffect } from "react";
import * as authService from "@/services/authService";
import type { User as BackendUser, ProfileUpdateData, AccountUpdateData } from "@/services/authService";

// Frontend User interface that matches our UI needs
export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  profilePicture?: string;
  balance: number;
  createdAt: string;
  isStaff: boolean;
  isSuperuser: boolean;
  profile: {
    bio: string | null;
    favorite_umamusume: string | null;
    total_bets_placed: number;
    total_bets_won: number;
    total_bets_lost: number;
    total_winnings: number;
    total_losses: number;
    win_rate: number;
    net_profit: number;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signup: (username: string, email: string, password: string, passwordConfirm: string, fullName?: string, phoneNumber?: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  updateAccount: (data: AccountUpdateData) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to convert backend user to frontend user format
const mapBackendUser = (backendUser: BackendUser): User => ({
  id: backendUser.id,
  username: backendUser.username,
  email: backendUser.email,
  fullName: backendUser.full_name,
  phoneNumber: backendUser.phone_number,
  profilePicture: backendUser.profile.avatar_url || undefined,
  balance: Number(backendUser.profile.balance),
  createdAt: backendUser.date_joined,
  isStaff: backendUser.is_staff,
  isSuperuser: backendUser.is_superuser,
  profile: {
    bio: backendUser.profile.bio,
    favorite_umamusume: backendUser.profile.favorite_umamusume,
    total_bets_placed: backendUser.profile.total_bets_placed,
    total_bets_won: backendUser.profile.total_bets_won,
    total_bets_lost: backendUser.profile.total_bets_lost,
    total_winnings: Number(backendUser.profile.total_winnings),
    total_losses: Number(backendUser.profile.total_losses),
    win_rate: backendUser.profile.win_rate,
    net_profit: Number(backendUser.profile.net_profit),
  },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if we have tokens and fetch user data
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");

      if (accessToken && refreshToken) {
        try {
          // Fetch current user data
          const backendUser = await authService.getCurrentUser();
          const mappedUser = mapBackendUser(backendUser);
          setUser(mappedUser);
        } catch (error) {
          console.error("Failed to fetch user:", error);
          // Clear invalid tokens
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      // Call login API
      const { access, refresh } = await authService.login({ username, password });

      // Store tokens
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      // Fetch user data
      const backendUser = await authService.getCurrentUser();
      const mappedUser = mapBackendUser(backendUser);
      setUser(mappedUser);
      return { success: true, user: mappedUser };
    } catch (error: any) {
      console.error("Login failed:", error);
      const errorMessage = error.response?.data?.error || "Invalid username or password";
      return { success: false, error: errorMessage };
    }
  };

  const signup = async (
    username: string,
    email: string,
    password: string,
    passwordConfirm: string,
    fullName?: string,
    phoneNumber?: string,
    avatarUrl?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Call register API
      const backendUser = await authService.register({
        username,
        email,
        password,
        password_confirm: passwordConfirm,
        full_name: fullName,
        phone_number: phoneNumber,
        avatar_url: avatarUrl,
      });

      // After registration, log the user in
      const loginResult = await login(username, password);

      if (loginResult.success) {
        return { success: true };
      } else {
        return { success: false, error: "Registration successful but login failed" };
      }
    } catch (error: any) {
      console.error("Signup failed:", error);

      // Extract error message from response
      const errorMessage = error.response?.data?.username?.[0]
        || error.response?.data?.email?.[0]
        || error.response?.data?.password?.[0]
        || error.response?.data?.non_field_errors?.[0]
        || "Registration failed";

      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const backendUser = await authService.getCurrentUser();
      const mappedUser = mapBackendUser(backendUser);
      setUser(mappedUser);
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  const updateProfile = async (data: ProfileUpdateData) => {
    try {
      const backendUser = await authService.updateProfile(data);
      const mappedUser = mapBackendUser(backendUser);
      setUser(mappedUser);
    } catch (error) {
      console.error("Failed to update profile:", error);
      throw error;
    }
  };

  const updateAccount = async (data: AccountUpdateData) => {
    try {
      const backendUser = await authService.updateAccount(data);
      const mappedUser = mapBackendUser(backendUser);
      setUser(mappedUser);
    } catch (error) {
      console.error("Failed to update account:", error);
      throw error;
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      const backendUser = await authService.uploadAvatar(file);
      const mappedUser = mapBackendUser(backendUser);
      setUser(mappedUser);
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
        updateProfile,
        updateAccount,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
