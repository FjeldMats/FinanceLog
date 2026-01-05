import React, { useState, useEffect } from 'react';
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

// Import the categories from your existing configuration
const CATEGORY_OPTIONS = {
  Hus: ['Lån Storebrand', 'moss kommune', 'Gjensidige forsikring hus'],
  'Faste utgifter': ['Telia telefon', 'Telia internett/Tv', 'Strøm'],
  Personelig: ['Spenst', 'Klær', 'Sparing'],
  Mat: ['Rema 1000', 'Kiwi', 'Spar', 'Meny', 'Bunnpris', 'Willis', 'Nordby', 'Obs', 'Div butikk'],
  Transport: ['Bensin', 'Toyota lån', 'Parkering', 'Gejensidige forsikring', 'Service', 'Bompenger'],
  Andre: ['Gaver', 'Hage', 'Andre']
};

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

const BarChartView = ({ transactions }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
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

  const filterTransactionsByCategory = (transactions, category) => {
    if (category === 'All') return transactions;
    
    return transactions.filter(tx => {
      // Check if transaction matches main category
      if (tx.category === category) return true;
      // Check if transaction's subcategory matches any in the category's subcategories
      if (tx.subcategory && CATEGORY_OPTIONS[category]) {
        return CATEGORY_OPTIONS[category].some(sub => 
          sub.toLowerCase() === tx.subcategory.toLowerCase()
        );
      }
      return false;
    });
  };

  const filteredTransactions = filterTransactionsByCategory(transactions, selectedCategory);
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
    new Set(transactions.map((tx) => new Date(tx.transaction_date).getFullYear()))
  ).sort();

  // Get current date for comparison
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Calculate monthly averages across years, excluding future months
  allMonths.forEach((month, monthIndex) => {
    const monthValues = years
      .filter(year => {
        // Include year if:
        // 1. It's a past year, or
        // 2. It's current year but the month is not in the future
        return year < currentYear || (year === currentYear && monthIndex <= currentMonth);
      })
      .map(year => groupedData[`${month} ${year}`] || 0);

    const sum = monthValues.reduce((acc, val) => acc + val, 0);
    // Only divide by the number of valid years we actually found data for
    monthlyAverages[month] = monthValues.length > 0 ? sum / monthValues.length : 0;
  });

  // Define distinct colors and patterns for each year
  const colorPalette = [
    {
      backgroundColor: 'rgba(255, 99, 132, 0.8)',  // Red
      borderColor: 'rgb(255, 99, 132)',
      pattern: {
        type: 'line',
        rotation: -45,
        lineWidth: 2,
        spacing: 6
      }
    },
    {
      backgroundColor: 'rgba(54, 162, 235, 0.8)',  // Blue
      borderColor: 'rgb(54, 162, 235)',
      pattern: {
        type: 'dot',
        spacing: 6
      }
    },
    {
      backgroundColor: 'rgba(75, 192, 192, 0.8)',  // Green
      borderColor: 'rgb(75, 192, 192)',
      pattern: {
        type: 'line',
        rotation: 45,
        lineWidth: 2,
        spacing: 6
      }
    },
    {
      backgroundColor: 'rgba(255, 206, 86, 0.8)',  // Yellow
      borderColor: 'rgb(255, 206, 86)',
      pattern: {
        type: 'line',
        rotation: -45,
        lineWidth: 2,
        spacing: 6
      }
    },
    {
      backgroundColor: 'rgba(153, 102, 255, 0.8)',  // Purple
      borderColor: 'rgb(153, 102, 255)',
      pattern: {
        type: 'dot',
        spacing: 6
      }
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
      pattern: yearStyles[year].pattern
    })),
    {
      type: 'line',
      label: 'Monthly Average',
      data: allMonths.map((month) => monthlyAverages[month]),
      borderColor: 'rgba(255, 0, 0, 0.8)',  // Red line
      backgroundColor: 'rgba(255, 0, 0, 0.1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(255, 0, 0, 0.8)',  // Red points
      pointRadius: 4,
      pointHoverRadius: 6,
      borderDash: [5, 5],  // Creates dotted/dashed line
      fill: false,
      tension: 0.4,  // Slight curve in the line
      order: 0  // Ensure line is drawn on top of bars
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
          className={`category-button ${selectedCategory === 'All' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('All')}
          style={{
            padding: '8px 12px',
            backgroundColor: selectedCategory === 'All' ? '#007bff' : '#f0f0f0',
            color: selectedCategory === 'All' ? 'white' : 'black',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 0.3s'
          }}
        >
          All
        </button>
        {Object.keys(CATEGORY_OPTIONS).map(category => (
          <button
            key={category}
            className={`category-button ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
            style={{
              padding: '8px 12px',
              backgroundColor: selectedCategory === category ? '#007bff' : '#f0f0f0',
              color: selectedCategory === category ? 'white' : 'black',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BarChartView;
