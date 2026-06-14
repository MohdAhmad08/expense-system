import axios from 'axios';

const isDev = import.meta.env.DEV;
const baseURL = isDev
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  : (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')
      ? import.meta.env.VITE_API_URL
      : '/api');

const API = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle session expiration
API.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Soft redirect if not on login page
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      window.location.href = '/login?expired=true';
    }
  }
  return Promise.reject(error);
});

export default API;
