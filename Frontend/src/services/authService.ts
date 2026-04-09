import apiClient from '@/config/api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  full_name?: string;
  phone_number?: string;
  password: string;
  password_confirm: string;
  avatar_url?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface UserProfile {
  balance?: number;
  total_bets_placed?: number;
  total_bets_won?: number;
  total_bets_lost?: number;
  total_winnings?: number;
  total_losses?: number;
  bio: string | null;
  avatar_url: string | null;
  favorite_umamusume: string | null;
  win_rate?: number;
  net_profit?: number;
}

export interface User {
  id?: number;
  username: string;
  email?: string;
  full_name?: string;
  phone_number?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  account_status?: 'active' | 'disabled';
  access_tier?: 'admin' | 'staff' | 'user';
  date_joined: string;
  profile: UserProfile;
}

export interface ProfileUpdateData {
  bio?: string;
  avatar_url?: string;
  favorite_umamusume?: string;
}

export interface AccountUpdateData {
  username?: string;
  email?: string;
}

export interface AdminUserUpdateData {
  username?: string;
  email?: string;
  full_name?: string;
  phone_number?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
}

/**
 * Login with username and password
 * Returns JWT tokens (access and refresh)
 */
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/api/auth/token/', credentials);
  return response.data;
};

/**
 * Register a new user account
 * Returns the created user data
 */
export const register = async (credentials: RegisterCredentials): Promise<User> => {
  const response = await apiClient.post<User>('/api/users/create/', credentials);
  return response.data;
};

/**
 * Get current authenticated user's data
 * Requires JWT token in headers (handled by interceptor)
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/api/users/me/');
  return response.data;
};

/**
 * Get a specific user's profile by username
 */
export const getUserProfile = async (username: string): Promise<User> => {
  const response = await apiClient.get<User>(`/api/users/profile/${username}/`);
  return response.data;
};

/**
 * Update current user's profile (bio, avatar_url, favorite_umamusume)
 */
export const updateProfile = async (data: ProfileUpdateData): Promise<User> => {
  const response = await apiClient.patch<User>('/api/users/profile/update/', data);
  return response.data;
};

/**
 * Update current user's account info (username, email)
 */
export const updateAccount = async (data: AccountUpdateData): Promise<User> => {
  const response = await apiClient.patch<User>('/api/users/account/update/', data);
  return response.data;
};

/**
 * Upload avatar image
 * Accepts a File object and uploads as multipart/form-data
 */
export const uploadAvatar = async (file: File): Promise<User> => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await apiClient.post<User>('/api/users/avatar/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Refresh JWT access token using refresh token
 */
export const refreshToken = async (refreshToken: string): Promise<{ access: string }> => {
  const response = await apiClient.post<{ access: string }>('/api/auth/token/refresh/', {
    refresh: refreshToken,
  });
  return response.data;
};

/**
 * Get all users (for admin/search purposes)
 * Returns a list of all users
 */
export const getAllUsers = async (): Promise<User[]> => {
  const response = await apiClient.get<User[]>('/api/users/');
  return response.data;
};

/**
 * Admin-only: list all users
 */
export const adminGetUsers = async (): Promise<User[]> => {
  const response = await apiClient.get<User[]>('/api/users/admin/');
  return response.data;
};

/**
 * Admin-only: create a new user
 */
export const adminCreateUser = async (credentials: RegisterCredentials): Promise<User> => {
  const response = await apiClient.post<User>('/api/users/admin/', credentials);
  return response.data;
};

/**
 * Admin-only: update a user (including flags)
 */
export const adminUpdateUser = async (id: number, data: AdminUserUpdateData): Promise<User> => {
  const response = await apiClient.patch<User>(`/api/users/admin/${id}/`, data);
  return response.data;
};

/**
 * Admin-only: delete a user
 */
export const adminDeleteUser = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/users/admin/${id}/`);
};

/**
 * Search users by username
 * Returns users matching the search query
 */
export const searchUsers = async (query: string): Promise<User[]> => {
  if (!query.trim()) return [];

  try {
    const allUsers = await getAllUsers();
    return allUsers.filter(user =>
      user.username.toLowerCase().includes(query.toLowerCase())
    );
  } catch (error) {
    console.error('Failed to search users:', error);
    return [];
  }
};

/**
 * Logout (client-side only - clears tokens)
 * JWT tokens are stateless, so logout is handled by removing tokens
 */
export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};
