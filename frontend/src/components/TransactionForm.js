import React, { useState } from 'react';
import { addTransaction, deleteTransaction } from '../api';

const CATEGORY_OPTIONS = {
  Hus: ['Lån Storebrand', 'Eindomskatt (moss kommune)', 'Renovasjon (moss kommune)', 'Gjensidige forsikring hus'],
  'Faste utgifter': ['Telia telefon', 'Telia internett/Tv', 'Strøm'],
  Personelig: ['Spenst', 'Klær', 'Sparing'],
  Mat: ['Rema 1000', 'Kiwi', 'Spar', 'Meny', 'Bunnpris', 'Willis', 'Nordby', 'Div butikk'],
  Transport: ['Bensin', 'Toyota lån', 'Parkering', 'Gejensidige forsikring', 'Service', 'Bompenger'],
  Andre: ['Gaver', 'Hage', 'Andre'],
  Inntekt: ['Alders pensjon jan', 'EU pensjon jan', 'pensjon storebrand jan', 'Moss kommune jan', 'Div inntekter jan', 'Alders pensjon Bjørg', 'pensjon moss kommune bjørg', 'div inntekter']
};

const formatNumber = (num) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' NOK';
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString('nb-NO');
};

// Get today's date in YYYY-MM-DD format
const getCurrentDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const TransactionForm = () => {
  const [newTransaction, setNewTransaction] = useState({
    transaction_date: getCurrentDate(),
    category: '',
    subcategory: '',
    description: '',
    amount: '',
  });

  const [transactions, setTransactions] = useState([]); // Store added transactions

  const handleCategoryChange = (event) => {
    setNewTransaction({ ...newTransaction, category: event.target.value, subcategory: '' });
  };

  const handleSubcategoryChange = (event) => {
    setNewTransaction({ ...newTransaction, subcategory: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!newTransaction.category || newTransaction.amount === '') {
      alert("Category and Amount are required.");
      return;
    }
    try {
      console.log('Submitting transaction:', newTransaction);
      const response = await addTransaction(newTransaction);
      console.log('Transaction added:', response);

      setTransactions([response, ...transactions]); // Add new transaction to local state

      // Reset form but keep current date
      setNewTransaction({
        transaction_date: getCurrentDate(),
        category: '',
        subcategory: '',
        description: '',
        amount: '',
      });
    } catch (error) {
      alert(`Failed to add transaction: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleRemove = async (id) => {
    try {
      await deleteTransaction(id); // Delete from database
      setTransactions(transactions.filter((tx) => tx.id !== id)); // Remove from UI
    } catch (error) {
      alert(`Failed to remove transaction: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="transaction-container">
      <h2>Add Transaction</h2>
      <form className="transaction-form" onSubmit={handleSubmit}>
        <label>Date</label>
        <input
          type="date"
          value={newTransaction.transaction_date}
          onChange={(e) => setNewTransaction({ ...newTransaction, transaction_date: e.target.value })}
          required
        />

        <label>Category <span className="required">*</span></label>
        <select value={newTransaction.category} onChange={handleCategoryChange} required>
          <option value="">Select Category</option>
          {Object.keys(CATEGORY_OPTIONS).map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <label>Subcategory (Optional)</label>
        <select value={newTransaction.subcategory} onChange={handleSubcategoryChange} disabled={!newTransaction.category}>
          <option value="">Select Subcategory</option>
          {newTransaction.category &&
            CATEGORY_OPTIONS[newTransaction.category].map((subcategory) => (
              <option key={subcategory} value={subcategory}>
                {subcategory}
              </option>
            ))}
        </select>

        <label>Description (Optional)</label>
        <input
          type="text"
          value={newTransaction.description}
          onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
        />

        <label>Amount <span className="required">*</span></label>
        <input
          type="number"
          value={newTransaction.amount}
          onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || '' })}
          required
        />

        <button type="submit">Add Transaction</button>
      </form>

      {/* Display added transactions (removed when page is refreshed) */}
      {transactions.length > 0 && (
        <div className="transaction-table-container">
          <h2>Recently Added Transactions</h2>
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{formatDate(tx.transaction_date)}</td>
                  <td>{tx.category}</td>
                  <td>{tx.subcategory || '—'}</td>
                  <td>{tx.description || '—'}</td>
                  <td className={tx.amount >= 0 ? 'positive' : 'negative'}>{formatNumber(tx.amount)}</td>
                  <td>
                    <button className="remove-button" onClick={() => handleRemove(tx.id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TransactionForm;
