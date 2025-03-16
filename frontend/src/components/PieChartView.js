import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

// Fixed category colors
const CATEGORY_COLORS = {
  Hus: '#FF6384', // Red
  'Faste utgifter': '#36A2EB', // Blue
  Personelig: '#FFCE56', // Yellow
  Mat: '#4BC0C0', // Teal
  Transport: '#9966FF', // Purple
  Andre: '#FF9F40', // Orange
};

const PieChartView = ({ transactions }) => {
  const categories = {};

  // Aggregate transaction amounts by category, excluding 'Inntekt'
  transactions.forEach((tx) => {
    const category = tx.category.trim(); // Trim whitespace
    if (category !== 'Inntekt') { // Exclude 'Inntekt'
      categories[category] = (categories[category] || 0) + tx.amount;
    }
  });

  // Convert categories to a sorted array
  const categoryEntries = Object.entries(categories).sort(([, a], [, b]) => b - a);

  // Extract sorted labels, data, and colors
  const labels = categoryEntries.map(([label]) => label);
  const data = categoryEntries.map(([, value]) => value);
  const backgroundColors = labels.map(
    (label) => CATEGORY_COLORS[label] || '#C9CBCF' // Default gray color for unmapped categories
  );

  const totalAmount = data.reduce((acc, val) => acc + val, 0);

  // Append percentages to labels
  const labelsWithPercentages = categoryEntries.map(
    ([label, value]) => `${label} (${((value / totalAmount) * 100).toFixed(1)}%)`
  );

  const chartData = {
    labels: labelsWithPercentages, // Use labels with percentages
    datasets: [
      {
        data,
        backgroundColor: backgroundColors,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right', // Position the legend to the right
        align: 'center',
        labels: {
          boxWidth: 20, // Size of the legend color boxes
          padding: 20, // Padding around labels
          font: {
            size: 16, // Increase font size
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const value = tooltipItem.raw;
            const percentage = ((value / totalAmount) * 100).toFixed(1);
            return `${tooltipItem.label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
      <div style={{ width: '60%', height: '400px' }}>
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
};

export default PieChartView;
