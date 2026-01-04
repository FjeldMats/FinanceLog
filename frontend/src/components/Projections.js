import React, { useState, useEffect } from 'react';
import { getTransactions } from '../api';
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart } from 'recharts';

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

  useEffect(() => {
    const loadTransactions = async () => {
      const data = await getTransactions();
      setTransactions(data);
    };
    loadTransactions();
  }, []);

  // Calculate category data with historical months + 12 month projection
  const getCategoryChartData = () => {
    const categoryData = {};

    // Initialize category tracking
    Object.keys(CATEGORY_OPTIONS).forEach(cat => {
      categoryData[cat] = {};
    });

    // Get current month to exclude incomplete data
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    // Aggregate transactions by category and month
    transactions.forEach(tx => {
      const date = new Date(tx.transaction_date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

      // Skip current month (incomplete data)
      if (monthKey === currentMonthKey) {
        return;
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

      // Skip if not in our category list
      if (!categoryData[mainCategory]) {
        return;
      }

      // Initialize month for this category if needed
      if (!categoryData[mainCategory][monthKey]) {
        categoryData[mainCategory][monthKey] = 0;
      }

      // Add to category total
      categoryData[mainCategory][monthKey] += Math.abs(tx.amount);
    });

    // For each category, calculate average and add 12 month projection
    const chartDataByCategory = {};

    Object.keys(CATEGORY_OPTIONS).forEach(category => {
      const monthlyAmounts = categoryData[category];
      const months = Object.keys(monthlyAmounts).sort();

      // Calculate average from all historical data (excluding current month)
      let total = 0;
      months.forEach(month => {
        total += monthlyAmounts[month] || 0;
      });
      const average = months.length > 0 ? total / months.length : 0;

      // Build chart data: historical + 12 month projection
      const chartData = [];

      // Add historical data with projection line
      months.forEach(month => {
        chartData.push({
          month: month,
          actual: monthlyAmounts[month],
          projected: average,
          isProjection: false
        });
      });

      // Add 12 month projection
      const lastMonth = months.length > 0 ? months[months.length - 1] : null;
      if (lastMonth) {
        const [year, month] = lastMonth.split('-').map(Number);

        for (let i = 1; i <= 12; i++) {
          const projDate = new Date(year, month - 1 + i, 1);
          const projMonthKey = `${projDate.getFullYear()}-${(projDate.getMonth() + 1).toString().padStart(2, '0')}`;

          chartData.push({
            month: projMonthKey,
            actual: null,
            projected: average,
            isProjection: true
          });
        }
      }

      chartDataByCategory[category] = chartData;
    });

    return chartDataByCategory;
  };

  const chartDataByCategory = getCategoryChartData();

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
      <h1 className="text-3xl font-bold text-primary">Category Projections</h1>
      <p className="text-gray-600">
        Historical spending (complete months only) with 12-month projections based on average.
        <span className="ml-2 text-sm">
          <span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span>Actual Data
          <span className="inline-block w-3 h-3 bg-green-500 ml-3 mr-1"></span>Projected Average
        </span>
      </p>

      {/* Category Charts */}
      {Object.keys(CATEGORY_OPTIONS).map(category => {
        const chartData = chartDataByCategory[category] || [];

        return (
          <div key={category} className="bg-table p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-primary mb-4">{category}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
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
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Actual Spending"
                  dot={{ r: 4, fill: '#3b82f6' }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Projected Average (12mo)"
                  dot={false}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
};

export default Projections;
