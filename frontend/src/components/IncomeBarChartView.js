import React, { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  BarController,
  LineController,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  BarController,
  LineController
);

const IncomeBarChartView = ({ transactions }) => {
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [chartKey, setChartKey] = useState(0);

  // Force chart re-render on window resize (including zoom)
  useEffect(() => {
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setChartKey(prev => prev + 1);
      }, 250); // Debounce to avoid too many re-renders
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Filter only income transactions
  const incomeTransactions = useMemo(() => {
    return transactions.filter(tx => tx.category.toLowerCase() === 'inntekt');
  }, [transactions]);

  // Get unique subcategories from income transactions
  const subcategories = useMemo(() => {
    const subs = new Set();
    incomeTransactions.forEach(tx => {
      if (tx.subcategory) {
        subs.add(tx.subcategory);
      }
    });
    return Array.from(subs).sort();
  }, [incomeTransactions]);

  // Filter by selected subcategory
  const filteredTransactions = useMemo(() => {
    if (selectedSubcategory === 'All') return incomeTransactions;
    return incomeTransactions.filter(tx => tx.subcategory === selectedSubcategory);
  }, [incomeTransactions, selectedSubcategory]);

  const groupedData = {};
  const monthlyAverages = {};

  // Group transactions by month and year
  filteredTransactions.forEach((tx) => {
    const date = new Date(tx.transaction_date);
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    const key = `${month} ${year}`;

    groupedData[key] = (groupedData[key] || 0) + tx.amount;
  });

  // Create labels for months
  const allMonths = Array.from({ length: 12 }, (_, i) =>
    new Date(0, i).toLocaleString('default', { month: 'long' })
  );

  // Extract years from the data
  const years = Array.from(
    new Set(incomeTransactions.map((tx) => new Date(tx.transaction_date).getFullYear()))
  ).sort();

  // Get current date for comparison
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Calculate monthly averages across years, excluding future months
  allMonths.forEach((month, monthIndex) => {
    const monthValues = years
      .filter(year => {
        return year < currentYear || (year === currentYear && monthIndex <= currentMonth);
      })
      .map(year => groupedData[`${month} ${year}`] || 0);

    const sum = monthValues.reduce((acc, val) => acc + val, 0);
    monthlyAverages[month] = monthValues.length > 0 ? sum / monthValues.length : 0;
  });

  // Define distinct colors for each year
  const colorPalette = [
    {
      backgroundColor: 'rgba(34, 197, 94, 0.8)',  // Green
      borderColor: 'rgb(34, 197, 94)',
    },
    {
      backgroundColor: 'rgba(59, 130, 246, 0.8)',  // Blue
      borderColor: 'rgb(59, 130, 246)',
    },
    {
      backgroundColor: 'rgba(168, 85, 247, 0.8)',  // Purple
      borderColor: 'rgb(168, 85, 247)',
    },
    {
      backgroundColor: 'rgba(236, 72, 153, 0.8)',  // Pink
      borderColor: 'rgb(236, 72, 153)',
    },
    {
      backgroundColor: 'rgba(251, 146, 60, 0.8)',  // Orange
      borderColor: 'rgb(251, 146, 60)',
    }
  ];

  // Create yearStyles dynamically for all years
  const yearStyles = {};
  years.forEach((year, index) => {
    yearStyles[year] = colorPalette[index % colorPalette.length];
  });

  // Organize data into datasets for Chart.js
  const datasets = [
    ...years.map((year) => ({
      type: 'bar',
      label: year.toString(),
      data: allMonths.map((month) => groupedData[`${month} ${year}`] || 0),
      backgroundColor: yearStyles[year].backgroundColor,
      borderColor: yearStyles[year].borderColor,
      borderWidth: 1,
    })),
    {
      type: 'line',
      label: 'Monthly Average',
      data: allMonths.map((month) => monthlyAverages[month]),
      borderColor: 'rgba(34, 197, 94, 0.8)',  // Green line
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(34, 197, 94, 0.8)',
      pointRadius: 4,
      pointHoverRadius: 6,
      borderDash: [5, 5],
      fill: false,
      tension: 0.4,
      order: 0
    }
  ];



  const chartData = {
    labels: allMonths,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: window.devicePixelRatio || 2,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          padding: 20,
          font: {
            size: 14
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            return `${context.dataset.label}: ${value.toLocaleString()} NOK`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amount (NOK)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          callback: (value) => value.toLocaleString()
        }
      },
      x: {
        title: {
          display: true,
          text: 'Month',
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      }
    },
    barPercentage: 0.8,
    categoryPercentage: 0.9,
  };

  return (
    <div>
      <div style={{ width: '100%', height: '400px', margin: '20px 0' }}>
        <Chart key={chartKey} type="bar" data={chartData} options={options} />
      </div>

      <div className="category-buttons" style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        margin: '20px 0'
      }}>
        <button
          className={`category-button ${selectedSubcategory === 'All' ? 'active' : ''}`}
          onClick={() => setSelectedSubcategory('All')}
          style={{
            padding: '8px 12px',
            backgroundColor: selectedSubcategory === 'All' ? '#22c55e' : '#f0f0f0',
            color: selectedSubcategory === 'All' ? 'white' : 'black',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 0.3s'
          }}
        >
          All
        </button>
        {subcategories.map(subcategory => (
          <button
            key={subcategory}
            className={`category-button ${selectedSubcategory === subcategory ? 'active' : ''}`}
            onClick={() => setSelectedSubcategory(subcategory)}
            style={{
              padding: '8px 12px',
              backgroundColor: selectedSubcategory === subcategory ? '#22c55e' : '#f0f0f0',
              color: selectedSubcategory === subcategory ? 'white' : 'black',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            {subcategory}
          </button>
        ))}
      </div>
    </div>
  );
};

export default IncomeBarChartView;
