import React, { useState, useEffect } from 'react';
import { getTransactions } from '../api';
import { Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ComposedChart, CartesianGrid } from 'recharts';

const Projections = () => {
  const [transactions, setTransactions] = useState([]);
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [incomeAdjustment, setIncomeAdjustment] = useState(0);
  const [expenseAdjustment, setExpenseAdjustment] = useState(0);
  const [initialSavings, setInitialSavings] = useState(0);

  useEffect(() => {
    const loadTransactions = async () => {
      const data = await getTransactions();
      setTransactions(data);
    };
    loadTransactions();
  }, []);

  // Calculate historical averages
  const calculateHistoricalData = () => {
    const monthlyData = {};
    
    transactions.forEach(tx => {
      const date = new Date(tx.transaction_date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 };
      }
      
      if (tx.category.trim() === 'Inntekt') {
        monthlyData[monthKey].income += tx.amount;
      } else {
        monthlyData[monthKey].expenses += Math.abs(tx.amount);
      }
    });

    const months = Object.keys(monthlyData).sort();
    const recentMonths = months.slice(-6); // Last 6 months for average
    
    let totalIncome = 0;
    let totalExpenses = 0;
    
    recentMonths.forEach(month => {
      totalIncome += monthlyData[month].income;
      totalExpenses += monthlyData[month].expenses;
    });
    
    const avgIncome = recentMonths.length > 0 ? totalIncome / recentMonths.length : 0;
    const avgExpenses = recentMonths.length > 0 ? totalExpenses / recentMonths.length : 0;
    
    return { avgIncome, avgExpenses, monthlyData };
  };

  // Generate projection data
  const generateProjections = () => {
    const { avgIncome, avgExpenses } = calculateHistoricalData();
    
    // Apply adjustments (percentage)
    const projectedIncome = avgIncome * (1 + incomeAdjustment / 100);
    const projectedExpenses = avgExpenses * (1 + expenseAdjustment / 100);
    const monthlySavings = projectedIncome - projectedExpenses;
    
    const projections = [];
    let cumulativeSavings = initialSavings;
    
    const today = new Date();
    
    for (let i = 0; i < projectionMonths; i++) {
      const projectionDate = new Date(today.getFullYear(), today.getMonth() + i + 1, 1);
      const monthKey = `${projectionDate.getFullYear()}-${(projectionDate.getMonth() + 1).toString().padStart(2, '0')}`;
      
      cumulativeSavings += monthlySavings;
      
      projections.push({
        month: monthKey,
        income: projectedIncome,
        expenses: projectedExpenses,
        savings: monthlySavings,
        cumulativeSavings: cumulativeSavings
      });
    }
    
    return { projections, avgIncome, avgExpenses, projectedIncome, projectedExpenses, monthlySavings };
  };

  const { projections, avgIncome, avgExpenses, projectedIncome, projectedExpenses, monthlySavings } = generateProjections();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('nb-NO', { year: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Financial Projections</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-table p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-1">Avg Monthly Income</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(avgIncome)}</p>
          <p className="text-xs text-gray-500 mt-1">Last 6 months</p>
        </div>
        
        <div className="bg-table p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-1">Avg Monthly Expenses</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(avgExpenses)}</p>
          <p className="text-xs text-gray-500 mt-1">Last 6 months</p>
        </div>
        
        <div className="bg-table p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-1">Projected Monthly Savings</h3>
          <p className={`text-2xl font-bold ${monthlySavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(monthlySavings)}
          </p>
          <p className="text-xs text-gray-500 mt-1">With adjustments</p>
        </div>
        
        <div className="bg-table p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-1">Projected Savings ({projectionMonths}mo)</h3>
          <p className={`text-2xl font-bold ${projections[projections.length - 1]?.cumulativeSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(projections[projections.length - 1]?.cumulativeSavings || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total accumulated</p>
        </div>
      </div>

      {/* Adjustment Controls */}
      <div className="bg-table p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-primary mb-4">Projection Settings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Projection Period (months)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={projectionMonths}
              onChange={(e) => setProjectionMonths(parseInt(e.target.value) || 12)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Income Adjustment (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={incomeAdjustment}
              onChange={(e) => setIncomeAdjustment(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Projected: {formatCurrency(projectedIncome)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expense Adjustment (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={expenseAdjustment}
              onChange={(e) => setExpenseAdjustment(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Projected: {formatCurrency(projectedExpenses)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Savings (NOK)
            </label>
            <input
              type="number"
              step="1000"
              value={initialSavings}
              onChange={(e) => setInitialSavings(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Cumulative Savings Chart */}
      <div className="bg-table p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-primary mb-4">Cumulative Savings Projection</h2>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={projections}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              labelFormatter={formatMonth}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cumulativeSavings"
              stroke="#10b981"
              strokeWidth={3}
              name="Cumulative Savings"
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Income vs Expenses Chart */}
      <div className="bg-table p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-primary mb-4">Projected Monthly Income vs Expenses</h2>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={projections}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              labelFormatter={formatMonth}
            />
            <Legend />
            <Bar dataKey="income" fill="#10b981" name="Income" />
            <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            <Line
              type="monotone"
              dataKey="savings"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Monthly Savings"
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Projection Table */}
      <div className="bg-table p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-primary mb-4">Detailed Projections</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 shadow-md">
              <tr className="bg-primary text-white">
                <th className="p-3 text-left">Month</th>
                <th className="p-3 text-right">Income</th>
                <th className="p-3 text-right">Expenses</th>
                <th className="p-3 text-right">Monthly Savings</th>
                <th className="p-3 text-right">Cumulative Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projections.map((proj, index) => (
                <tr key={proj.month} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="p-3">{formatMonth(proj.month)}</td>
                  <td className="p-3 text-right text-green-600 font-semibold">{formatCurrency(proj.income)}</td>
                  <td className="p-3 text-right text-red-600 font-semibold">{formatCurrency(proj.expenses)}</td>
                  <td className={`p-3 text-right font-semibold ${proj.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(proj.savings)}
                  </td>
                  <td className={`p-3 text-right font-bold ${proj.cumulativeSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(proj.cumulativeSavings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Projections;

