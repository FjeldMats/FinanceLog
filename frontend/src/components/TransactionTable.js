import React, { useEffect, useState } from 'react';
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

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id);
      setTransactions(transactions.filter((tx) => tx.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction.');
    }
  };

  return (
    <div className="transaction-table-container">
      <h2>Transactions</h2>
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
              <td>{tx.subcategory}</td>
              <td>{tx.description}</td>
              <td className={tx.amount >= 0 ? 'positive' : 'negative'}>{formatNumber(tx.amount)}</td>
              <td>
                <button className="delete-button" onClick={() => handleDelete(tx.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
