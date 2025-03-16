import React, { useState, useEffect } from 'react';
import PieChartView from './PieChartView';
import BarChartView from './BarChartView'; // Import the BarChartView
import { getTransactions } from '../api';
import '../Dashboard.css';

const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const loadTransactions = async () => {
      const data = await getTransactions();
      setTransactions(data);
    };
    loadTransactions();
  }, []);

  // Extract unique years from transactions
  const availableYears = [
    ...new Set(
      transactions
        .map((tx) => {
          const date = new Date(tx.transaction_date);
          return !isNaN(date) ? date.getFullYear() : null;
        })
        .filter((year) => year !== null)
    ),
  ];

  // Filter transactions by selected year for the pie chart
  const filteredTransactions = transactions.filter((tx) => {
    const date = new Date(tx.transaction_date);
    return date.getFullYear() === selectedYear;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            style={{
              padding: '10px 20px',
              margin: '0 5px',
              backgroundColor: year === selectedYear ? '#36A2EB' : '#f4f4f4',
              color: year === selectedYear ? 'white' : '#333',
              border: '1px solid #ccc',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            {year}
          </button>
        ))}
      </div>
      <div>
        <h1>Expendeture breakdown</h1>
        {/* Pass only filtered transactions to the PieChart */}
        <PieChartView transactions={filteredTransactions} />
      </div>
      <h1>Expendeture comparison on month </h1>
      <div>
        {/* Pass all transactions to the BarChart */}
        <BarChartView transactions={transactions} />
      </div>
    </div>
  );
};

export default Dashboard;
