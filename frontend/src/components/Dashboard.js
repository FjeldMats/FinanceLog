import React, { useState, useEffect } from 'react';
import StackedChartView from './StackedChartView';
import BarChartView from './BarChartView';
import { Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ComposedChart, CartesianGrid } from 'recharts';
import { getTransactions } from '../api';
import '../Dashboard.css';

const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);

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
  ].sort((a, b) => a - b); // Sort years in ascending order

  // Group transactions by month for income, expenditure, and difference
  const financialData = transactions.reduce((acc, tx) => {
    const date = new Date(tx.transaction_date);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`; // Format: YYYY-MM

    if (!acc[monthKey]) {
      acc[monthKey] = { date: monthKey, income: 0, expenditure: 0, difference: 0 };
    }

    if (tx.category.trim() === 'Inntekt') {
      acc[monthKey].income += tx.amount;
    } else {
      acc[monthKey].expenditure += tx.amount;
    }

    // Calculate the difference (income - expenditure)
    acc[monthKey].difference = acc[monthKey].income - acc[monthKey].expenditure;

    return acc;
  }, {});

  // Convert data into an array and sort by date
  const sortedFinancialData = Object.values(financialData).sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-center mb-8">Expenditure Breakdown</h1>
      
      <div className="flex flex-nowrap gap-6 justify-center overflow-x-auto min-h-[400px] w-full px-4">
        {availableYears.map((year) => {
          const yearTransactions = transactions.filter((tx) => {
            const date = new Date(tx.transaction_date);
            return date.getFullYear() === year;
          });

          return (
            <div key={year} className="flex-shrink-0 w-[400px]">
              <h2 className="text-xl font-bold text-center mb-4">{year}</h2>
              <StackedChartView transactions={yearTransactions} />
            </div>
          );
        })}
      </div>

      <h1 className="text-3xl font-bold text-center mb-8">Expenditure Comparison by Month</h1>
      <div className="bg-table rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Monthly Summary</h2>
        <BarChartView transactions={transactions} />
      </div>

      {/* NEW COMBINED CHART: Income, Expenditure & Difference */}
      <h1 className="text-3xl font-bold text-center mb-8">Income, Expenditure & Savings Over Time</h1>
      <div className="income-chart-container">
        {sortedFinancialData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={sortedFinancialData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(date) => date} />
              <YAxis />
              <Tooltip formatter={(value) => `${parseFloat(value).toLocaleString()} NOK`} />
              <Legend />
              
              {/* Add patterns */}
              <defs>
                <pattern id="pattern-positive" patternUnits="userSpaceOnUse" width="10" height="10">
                  <path d="M0 10L10 0" strokeWidth="1" stroke="#fff" fill="none"/>
                </pattern>
                <pattern id="pattern-negative" patternUnits="userSpaceOnUse" width="10" height="10">
                  <path d="M0 0L10 10" strokeWidth="1" stroke="#fff" fill="none"/>
                </pattern>
              </defs>

              {/* Income Line - Green */}
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#2ECC71" 
                strokeWidth={2} 
                name="Income (Inntekt)"
              />
              {/* Expenditure Line - Red */}
              <Line 
                type="monotone" 
                dataKey="expenditure" 
                stroke="#E74C3C" 
                strokeWidth={2} 
                name="Expenditure"
              />

              {/* Difference Bar - Green for Surplus, Red for Deficit with patterns */}
              <Bar 
                dataKey="difference" 
                name="Savings/Loss"
                barSize={20}
                shape={(props) => {
                  const { x, y, width, height, payload } = props;
                  const computedHeight = Math.abs(height);
                  const computedY = height < 0 ? y + height : y;
                  const isPositive = payload.difference >= 0;
                  
                  // Different colors for positive/negative
                  const baseColor = isPositive ? "#27AE60" : "#C0392B";
                  
                  return (
                    <g>
                      <rect
                        x={x}
                        y={computedY}
                        width={width}
                        height={computedHeight}
                        fill={baseColor}
                      />
                      <rect
                        x={x}
                        y={computedY}
                        width={width}
                        height={computedHeight}
                        fill={`url(#pattern-${isPositive ? 'positive' : 'negative'})`}
                        fillOpacity={0.4}
                      />
                    </g>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p>No financial data available.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
