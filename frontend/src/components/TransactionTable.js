import React, { useEffect, useState, useMemo } from 'react';
import { getTransactions, deleteTransaction, updateTransaction } from '../api';
import { DotsVerticalIcon } from '@heroicons/react/solid';

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' NOK';
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString('nb-NO');
};

const ActionMenu = ({ transaction, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-gray-100 focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1" role="menu">
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  onEdit(transaction);
                  setIsOpen(false);
                }}
              >
                Edit
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                onClick={() => {
                  onDelete(transaction);
                  setIsOpen(false);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const TransactionTable = () => {
  const [transactions, setTransactions] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [monthYearFilter, setMonthYearFilter] = useState('');
  const [transactionToDelete, setTransactionToDelete] = useState(null); // New state for modal
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Add CATEGORY_OPTIONS from TransactionForm.js
  const CATEGORY_OPTIONS = {
    Hus: ['Lån Storebrand', 'Eindomskatt (moss kommune)', 'Renovasjon (moss kommune)', 'Gjensidige forsikring hus'],
    'Faste utgifter': ['Telia telefon', 'Telia internett/Tv', 'Strøm'],
    Personelig: ['Spenst', 'Klær', 'Sparing'],
    Mat: ['Rema 1000', 'Kiwi', 'Spar', 'Meny', 'Bunnpris', 'Willis', 'Nordby', 'Obs', 'Div butikk'],
    Transport: ['Bensin', 'Toyota lån', 'Parkering', 'Gejensidige forsikring', 'Service', 'Bompenger'],
    Andre: ['Gaver', 'Hage', 'Andre'],
    Inntekt: ['Alders pensjon jan', 'EU pensjon jan', 'pensjon storebrand jan', 'Moss kommune jan', 'Div inntekter jan']
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const data = await getTransactions();
        // Sort transactions by date (newest first)
        const sortedTransactions = data.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
        setTransactions(sortedTransactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, []);

  // Compute unique categories
  const categories = useMemo(() => {
    const cats = transactions.map(tx => tx.category);
    return Array.from(new Set(cats));
  }, [transactions]);

  // Helper function to generate month-year options between two dates
  const generateMonthYearOptions = (minDate, maxDate) => {
    let options = [];
    let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    let last = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    while (current <= last) {
      const option = current.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      options.push(option);
      current.setMonth(current.getMonth() + 1);
    }
    return options;
  };

  // Compute month-year options based on transaction dates if available.
  const monthYearOptions = useMemo(() => {
    if (transactions.length === 0) return [];
    const dates = transactions.map(tx => new Date(tx.transaction_date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    return generateMonthYearOptions(minDate, maxDate);
  }, [transactions]);

  // Filter transactions based on the filters
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch =
      searchText === '' || (tx.description && tx.description.toLowerCase().includes(searchText.toLowerCase()));
    const matchesCategory = categoryFilter === '' || tx.category === categoryFilter;
    let matchesMonthYear = true;
    if (monthYearFilter !== '') {
      const txDate = new Date(tx.transaction_date);
      const txMonthYear = txDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      matchesMonthYear = txMonthYear === monthYearFilter;
    }
    return matchesSearch && matchesCategory && matchesMonthYear;
  });

  const handleConfirmDelete = async (id) => { // New function for confirmation action
    try {
      await deleteTransaction(id);
      setTransactions(transactions.filter((tx) => tx.id !== id));
      setTransactionToDelete(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-table p-6 rounded-lg shadow-md">
      <h2>Transactions</h2>
      {/* Filter UI */}
      <div className="flex gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Search description..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="input-field flex-1"
        />
        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field w-48"
        >
          <option value=''>All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select 
          value={monthYearFilter} 
          onChange={(e) => setMonthYearFilter(e.target.value)}
          className="input-field w-48"
        >
          <option value=''>All Months</option>
          {monthYearOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
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
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="p-3">{formatDate(tx.transaction_date)}</td>
                <td className="p-3">{tx.category}</td>
                <td className="p-3">{tx.subcategory}</td>
                <td className="p-3">{tx.description}</td>
                <td className={`p-3 ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatNumber(tx.amount)}
                </td>
                <td className="p-3">
                  <ActionMenu
                    transaction={tx}
                    onEdit={() => setEditingTransaction(tx)}
                    onDelete={() => setTransactionToDelete(tx)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Edit Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[400px] shadow-xl">
            <h3 className="text-xl font-bold mb-4">Edit Transaction</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category:</label>
              <select
                value={editingTransaction.category}
                onChange={(e) => setEditingTransaction({
                  ...editingTransaction,
                  category: e.target.value,
                  subcategory: ''
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                {Object.keys(CATEGORY_OPTIONS).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory:</label>
              <select
                value={editingTransaction.subcategory || ''}
                onChange={(e) => setEditingTransaction({
                  ...editingTransaction,
                  subcategory: e.target.value
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                <option value="">Select Subcategory</option>
                {CATEGORY_OPTIONS[editingTransaction.category]?.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount:</label>
              <input
                type="number"
                value={editingTransaction.amount}
                onChange={(e) => setEditingTransaction({
                  ...editingTransaction,
                  amount: parseFloat(e.target.value) || 0
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={async () => {
                  try {
                    await updateTransaction(editingTransaction.id, editingTransaction);
                    setTransactions(transactions.map(t => 
                      t.id === editingTransaction.id ? editingTransaction : t
                    ));
                    setEditingTransaction(null);
                  } catch (error) {
                    alert('Failed to update transaction');
                  }
                }}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditingTransaction(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Delete Modal */}
      {transactionToDelete && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="modal" style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p>Are you sure you want to delete?</p>
            {/* New: Show details of the transaction */}
            <p>
              {transactionToDelete.description} — {transactionToDelete.category} — {formatDate(transactionToDelete.transaction_date)} — {formatNumber(transactionToDelete.amount)}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button style={{
                backgroundColor: 'red',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }} onClick={() => handleConfirmDelete(transactionToDelete.id)}>Yes</button>
              <button style={{
                backgroundColor: 'grey',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }} onClick={() => setTransactionToDelete(null)}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;
