import React, { useState } from 'react';
import { addTransaction, deleteTransaction } from '../api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CATEGORY_OPTIONS = {
  Hus: ['Lån Storebrand', 'moss kommune', 'Gjensidige forsikring hus'],
  'Faste utgifter': ['Telia telefon', 'Telia internett/Tv', 'Strøm'],
  Personelig: ['Spenst', 'Klær', 'Sparing'],
  Mat: ['Rema 1000', 'Kiwi', 'Spar', 'Meny', 'Bunnpris', 'Willis', 'Nordby', 'Obs', 'Div butikk'],
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

  // State for DatePicker (needs to be a Date object)
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [transactions, setTransactions] = useState([]); // Store added transactions

  const handleCategoryChange = (event) => {
    setNewTransaction({ ...newTransaction, category: event.target.value, subcategory: '' });
  };

  const handleSubcategoryChange = (event) => {
    setNewTransaction({ ...newTransaction, subcategory: event.target.value });
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    // Convert Date object to YYYY-MM-DD format for the transaction
    const formattedDate = date.toISOString().split('T')[0];
    setNewTransaction({ ...newTransaction, transaction_date: formattedDate });
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
      const today = new Date();
      setSelectedDate(today);
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
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto">
      {/* Add Transaction Form */}
      <div className="w-full bg-table p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Add Transaction</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block font-medium mb-1">Date</label>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              dateFormat="dd/MM/yyyy"
              className="input-field w-full"
              wrapperClassName="w-full"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Category <span className="required">*</span></label>
            <select 
              value={newTransaction.category} 
              onChange={handleCategoryChange} 
              required
              className="input-field w-full"
            >
              <option value="">Select Category</option>
              {Object.keys(CATEGORY_OPTIONS).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Subcategory (Optional)</label>
            <select 
              value={newTransaction.subcategory} 
              onChange={handleSubcategoryChange} 
              disabled={!newTransaction.category}
              className="input-field w-full"
            >
              <option value="">Select Subcategory</option>
              {newTransaction.category &&
                CATEGORY_OPTIONS[newTransaction.category].map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Description (Optional)</label>
            <input
              type="text"
              value={newTransaction.description}
              onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Amount <span className="required">*</span></label>
            <input
              type="number"
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || '' })}
              required
              className="input-field w-full"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Add Transaction
          </button>
        </form>

        {/* Display added transactions (removed when page is refreshed) */}
        {transactions.length > 0 && (
          <div className="w-full bg-table p-6 rounded-lg shadow-md mt-8">
            <h2 className="text-xl font-bold mb-4">Recently Added Transactions</h2>
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[15%]" /> {/* Date */}
                <col className="w-[15%]" /> {/* Category */}
                <col className="w-[20%]" /> {/* Subcategory */}
                <col className="w-[25%]" /> {/* Description */}
                <col className="w-[15%]" /> {/* Amount */}
                <col className="w-[10%]" /> {/* Actions */}
              </colgroup>
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Subcategory</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="p-3 truncate">{formatDate(tx.transaction_date)}</td>
                    <td className="p-3 truncate">{tx.category}</td>
                    <td className="p-3 truncate">{tx.subcategory || '—'}</td>
                    <td className="p-3 truncate">{tx.description || '—'}</td>
                    <td className={`p-3 truncate ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatNumber(tx.amount)}
                    </td>
                    <td className="p-3">
                      <button 
                        onClick={() => handleRemove(tx.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionForm;
