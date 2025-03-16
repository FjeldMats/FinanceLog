import React, { useState } from 'react';
import { addTransaction } from '../api';

const TransactionForm = () => {
  const [formData, setFormData] = useState({
    transaction_date: '',
    category: '',
    subcategory: '',
    description: '',
    amount: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addTransaction({
        ...formData,
        amount: parseFloat(formData.amount), // Ensure amount is a number
      });
      alert('Transaction added successfully!');
      setFormData({
        transaction_date: '',
        category: '',
        subcategory: '',
        description: '',
        amount: '',
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add Transaction</h2>
      <label>
        Date:
        <input
          type="date"
          name="transaction_date"
          value={formData.transaction_date}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Category:
        <input
          type="text"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Subcategory:
        <input
          type="text"
          name="subcategory"
          value={formData.subcategory}
          onChange={handleChange}
        />
      </label>
      <label>
        Description:
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
        />
      </label>
      <label>
        Amount:
        <input
          type="number"
          name="amount"
          step="0.01"
          value={formData.amount}
          onChange={handleChange}
          required
        />
      </label>
      <button type="submit">Add Transaction</button>
    </form>
  );
};

export default TransactionForm;
