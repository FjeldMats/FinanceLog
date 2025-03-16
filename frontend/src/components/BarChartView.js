import React from 'react';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const BarChartView = ({ transactions }) => {
  const groupedData = {};

  // Group transactions by month and year
  transactions.forEach((tx) => {
    const date = new Date(tx.transaction_date);
    const month = date.toLocaleString('default', { month: 'long' }); // Get month name
    const year = date.getFullYear(); // Get year
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
  );

  // Organize data into datasets for Chart.js
  const datasets = years.map((year, index) => ({
    label: year.toString(),
    data: allMonths.map((month) => groupedData[`${month} ${year}`] || 0),
    backgroundColor: `rgba(${index * 50}, ${100 + index * 30}, ${150 - index * 20}, 0.6)`,
  }));

  const chartData = {
    labels: allMonths,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amount',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Month',
        },
      },
    },
  };

  return (
    <div style={{ width: '100%', height: '400px', margin: '20px 0' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default BarChartView;
