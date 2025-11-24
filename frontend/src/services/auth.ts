import axios from 'axios';

const API_URL = '/api';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const signUp = async (email: string, password: string, name?: string): Promise<void> => {
  const response = await axios.post<AuthResponse>(`${API_URL}/auth/signup`, {
    email,
    password,
    name,
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (response.data.token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
  }
};

export const signIn = async (email: string, password: string): Promise<void> => {
  const response = await axios.post<AuthResponse>(`${API_URL}/auth/signin`, {
    email,
    password,
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (response.data.token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
  }
};

export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const getCurrentUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};
