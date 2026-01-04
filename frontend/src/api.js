import axios from 'axios';

console.log('API URL:', process.env.REACT_APP_API_URL);
const API_URL = process.env.REACT_APP_API_URL;

// Add token to all requests
axios.interceptors.request.use((request) => {
  const token = localStorage.getItem('token');
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`API Request: ${request.method.toUpperCase()} ${request.url}`, request.data || '');
  return request;
});

// Handle responses and token expiration
axios.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`API Error: ${error.response?.status} ${error.response?.config?.url}`, error.response?.data);

    // If token is invalid or expired, redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if not already on login/register page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const getTransactions = async (params = {}) => { // updated function to accept parameters
  try {
    const response = await axios.get(`${API_URL}/transactions`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error.response?.data || error.message);
    throw error;
  }
};

export const addTransaction = async (transaction) => {
  try {
    const response = await axios.post(`${API_URL}/transaction`, transaction, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding transaction:', error.response?.data || error.message);
    throw error;
  }
};

export const deleteTransaction = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/transaction/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting transaction:', error.response?.data || error.message);
    throw error;
  }
};

export const updateTransaction = async (id, transaction) => {
  try {
    const response = await axios.put(`${API_URL}/transaction/${id}`, transaction, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating transaction:', error.response?.data || error.message);
    throw error;
  }
};

export const getProjections = async (category) => {
  try {
    const response = await axios.get(`${API_URL}/projections/${encodeURIComponent(category)}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching projections:', error.response?.data || error.message);
    throw error;
  }
};

// Authentication API functions
export const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username,
      password
    });
    return response.data;
  } catch (error) {
    console.error('Error logging in:', error.response?.data || error.message);
    throw error;
  }
};

export const register = async (username, email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      username,
      email,
      password
    });
    return response.data;
  } catch (error) {
    console.error('Error registering:', error.response?.data || error.message);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await axios.get(`${API_URL}/auth/me`);
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error.response?.data || error.message);
    throw error;
  }
};
