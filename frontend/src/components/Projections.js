import React, { useState, useEffect } from 'react';
import { getTransactions } from '../api';
import { Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ComposedChart, CartesianGrid } from 'recharts';

const CATEGORY_OPTIONS = {
  Hus: ['Lån Storebrand', 'Eindomskatt  (moss kommune)', 'Renovasjon (moss kommune)', 'Gjensidige forsikring hus'],
  'Faste utgifter': ['Telia telefon', 'Telia internett/Tv', 'Strøm'],
  Personelig: ['Spenst', 'Klær', 'Sparing'],
  Mat: ['Rema 1000', 'Kiwi', 'Spar', 'Meny','Obs', 'Bunnpris', 'Willis', 'Nordby', 'Div butikk'],
  Transport: ['Bensin', 'Toyota lån', 'Parkering', 'Gejensidige forsikring', 'Service', 'Bompenger'],
  Andre: ['Gaver', 'Hage', 'Andre']
};

const Projections = () => {
  const [transactions, setTransactions] = useState([]);
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [initialSavings, setInitialSavings] = useState(0);
  const [categoryAdjustments, setCategoryAdjustments] = useState({}); // Store adjustments per category

  useEffect(() => {
    const loadTransactions = async () => {
      const data = await getTransactions();
      setTransactions(data);
    };
    loadTransactions();
  }, []);

  // Calculate historical averages by category
  const calculateHistoricalData = () => {
    const monthlyData = {};
    const categoryData = {}; // Track spending by category per month

    // Initialize category tracking
    Object.keys(CATEGORY_OPTIONS).forEach(cat => {
      categoryData[cat] = {};
    });
    categoryData['Inntekt'] = {};

    transactions.forEach(tx => {
      const date = new Date(tx.transaction_date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 };
      }

      // Determine which main category this transaction belongs to
      let mainCategory = tx.category.trim();

      // Check if it's a subcategory match
      if (tx.subcategory) {
        for (let cat in CATEGORY_OPTIONS) {
          if (CATEGORY_OPTIONS[cat].some(sub => sub.toLowerCase() === tx.subcategory.toLowerCase())) {
            mainCategory = cat;
            break;
          }
        }
      }

      // Initialize month for this category if needed
      if (!categoryData[mainCategory]) {
        categoryData[mainCategory] = {};
      }
      if (!categoryData[mainCategory][monthKey]) {
        categoryData[mainCategory][monthKey] = 0;
      }

      // Add to category total
      categoryData[mainCategory][monthKey] += Math.abs(tx.amount);

      // Also track overall income/expenses
      if (mainCategory === 'Inntekt') {
        monthlyData[monthKey].income += tx.amount;
      } else {
        monthlyData[monthKey].expenses += Math.abs(tx.amount);
      }
    });

    const months = Object.keys(monthlyData).sort();
    const allMonths = months;

    // Calculate averages for each category
    const categoryAverages = {};
    for (let cat in categoryData) {
      let total = 0;
      allMonths.forEach(month => {
        total += categoryData[cat][month] || 0;
      });
      categoryAverages[cat] = allMonths.length > 0 ? total / allMonths.length : 0;
    }

    let totalIncome = 0;
    let totalExpenses = 0;

    allMonths.forEach(month => {
      totalIncome += monthlyData[month].income;
      totalExpenses += monthlyData[month].expenses;
    });

    const avgIncome = allMonths.length > 0 ? totalIncome / allMonths.length : 0;
    const avgExpenses = allMonths.length > 0 ? totalExpenses / allMonths.length : 0;

    return { avgIncome, avgExpenses, monthlyData, totalMonths: allMonths.length, categoryAverages };
  };

  // Generate projection data
  const generateProjections = () => {
    const { avgIncome, avgExpenses, totalMonths, categoryAverages } = calculateHistoricalData();

    // Apply category-specific adjustments
    const projectedCategories = {};
    let totalProjectedExpenses = 0;

    Object.keys(CATEGORY_OPTIONS).forEach(cat => {
      const adjustment = categoryAdjustments[cat] || 0;
      const avgAmount = categoryAverages[cat] || 0;
      projectedCategories[cat] = avgAmount * (1 + adjustment / 100);
      totalProjectedExpenses += projectedCategories[cat];
    });

    const projectedIncome = avgIncome;
    const monthlySavings = projectedIncome - totalProjectedExpenses;

    const projections = [];
    let cumulativeSavings = initialSavings;

    const today = new Date();

    for (let i = 0; i < projectionMonths; i++) {
      const projectionDate = new Date(today.getFullYear(), today.getMonth() + i + 1, 1);
      const monthKey = `${projectionDate.getFullYear()}-${(projectionDate.getMonth() + 1).toString().padStart(2, '0')}`;

      cumulativeSavings += monthlySavings;

      const monthData = {
        month: monthKey,
        income: projectedIncome,
        expenses: totalProjectedExpenses,
        savings: monthlySavings,
        cumulativeSavings: cumulativeSavings
      };

      // Add each category to the month data
      Object.keys(CATEGORY_OPTIONS).forEach(cat => {
        monthData[cat] = projectedCategories[cat];
      });

      projections.push(monthData);
    }

    return {
      projections,
      avgIncome,
      avgExpenses,
      projectedIncome,
      projectedExpenses: totalProjectedExpenses,
      monthlySavings,
      totalMonths,
      categoryAverages,
      projectedCategories
    };
  };

  const {
    projections,
    avgIncome,
    avgExpenses,
    projectedIncome,
    projectedExpenses,
    monthlySavings,
    totalMonths,
    categoryAverages,
    projectedCategories
  } = generateProjections();

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
          <p className="text-xs text-gray-500 mt-1">All historical data ({totalMonths} months)</p>
        </div>

        <div className="bg-table p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-1">Avg Monthly Expenses</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(avgExpenses)}</p>
          <p className="text-xs text-gray-500 mt-1">All historical data ({totalMonths} months)</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

        {/* Category Adjustments */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Category Adjustments (%)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(CATEGORY_OPTIONS).map(category => (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {category}
                  </label>
                  <p className="text-xs text-gray-500">
                    Avg: {formatCurrency(categoryAverages[category] || 0)}
                  </p>
                </div>
                <input
                  type="number"
                  step="1"
                  value={categoryAdjustments[category] || 0}
                  onChange={(e) => setCategoryAdjustments({
                    ...categoryAdjustments,
                    [category]: parseFloat(e.target.value) || 0
                  })}
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-table p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-primary mb-4">Category Projections</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Historical Avg
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adjustment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projected Monthly
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total ({projectionMonths}mo)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.keys(CATEGORY_OPTIONS).map(category => {
                const avg = categoryAverages[category] || 0;
                const adjustment = categoryAdjustments[category] || 0;
                const projected = projectedCategories[category] || 0;
                const total = projected * projectionMonths;

                return (
                  <tr key={category} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                      {formatCurrency(avg)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={adjustment > 0 ? 'text-red-600' : adjustment < 0 ? 'text-green-600' : 'text-gray-700'}>
                        {adjustment > 0 ? '+' : ''}{adjustment}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(projected)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-100 font-bold">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Total Expenses
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatCurrency(avgExpenses)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  -
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatCurrency(Object.values(projectedCategories).reduce((sum, val) => sum + val, 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatCurrency(Object.values(projectedCategories).reduce((sum, val) => sum + val, 0) * projectionMonths)}
                </td>
              </tr>
            </tbody>
          </table>
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

