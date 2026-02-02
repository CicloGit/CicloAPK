import axios from 'axios';
import { firebaseAuth } from '../firebase';
import { signOut } from 'firebase/auth';

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
  const user = firebaseAuth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    const headers: any = config.headers || {};
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      await signOut(firebaseAuth);
    }
    throw error;
  },
);
