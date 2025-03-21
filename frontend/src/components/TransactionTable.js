import React, { useEffect, useState, useMemo } from 'react';
import { getTransactions, deleteTransaction } from '../api';

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' NOK';
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString('nb-NO');
};

const TransactionTable = () => {
  const [transactions, setTransactions] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [monthYearFilter, setMonthYearFilter] = useState('');
  const [transactionToDelete, setTransactionToDelete] = useState(null); // New state for modal

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
    <div className="transaction-table-container">
      <h2>Transactions</h2>
      {/* Filter UI */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search description..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value=''>All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select value={monthYearFilter} onChange={(e) => setMonthYearFilter(e.target.value)}>
          <option value=''>All Months</option>
          {monthYearOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
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
          {filteredTransactions.map((tx) => (
            <tr key={tx.id}>
              <td>{formatDate(tx.transaction_date)}</td>
              <td>{tx.category}</td>
              <td>{tx.subcategory}</td>
              <td>{tx.description}</td>
              <td className={tx.amount >= 0 ? 'positive' : 'negative'}>{formatNumber(tx.amount)}</td>
              <td>
                <button className="delete-button" onClick={() => setTransactionToDelete(tx)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
