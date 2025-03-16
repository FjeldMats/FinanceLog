import axios from 'axios';

console.log('API URL:', process.env.REACT_APP_API_URL);
const API_URL = process.env.REACT_APP_API_URL;

export const getTransactions = async () => {
  const response = await fetch(`${API_URL}/transactions`);
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  return response.json();
};

export const addTransaction = async (transaction) => {
  const response = await axios.post(`${API_URL}/transaction`, transaction);
  return response.data;
};

export const deleteTransaction = async (id) => {
  const response = await axios.delete(`${API_URL}/transaction/${id}`);
  return response.data;
};
