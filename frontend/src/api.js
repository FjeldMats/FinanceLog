import axios from 'axios';

console.log('API URL:', process.env.REACT_APP_API_URL);
const API_URL = process.env.REACT_APP_API_URL;

// Debugging: Log all API requests
axios.interceptors.request.use((request) => {
  console.log(`API Request: ${request.method.toUpperCase()} ${request.url}`, request.data || '');
  return request;
});

// Debugging: Log all API responses
axios.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`API Error: ${error.response?.status} ${error.response?.config?.url}`, error.response?.data);
    return Promise.reject(error);
  }
);

export const getTransactions = async () => {
  try {
    const response = await axios.get(`${API_URL}/transactions`);
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
