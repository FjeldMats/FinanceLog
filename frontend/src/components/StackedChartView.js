import React from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

const CATEGORY_COLORS = {
  Hus: '#FF6384', // Red
  'Faste utgifter': '#36A2EB', // Blue
  Personelig: '#FFCE56', // Yellow
  Mat: '#4BC0C0', // Teal
  Transport: '#9966FF', // Purple
  Andre: '#FF9F40', // Orange
};

const TreeMapView = ({ transactions }) => {
  // Group transactions by category and sum amounts (excluding 'Inntekt')
  const categoryTotals = transactions.reduce((acc, tx) => {
    if (tx.category.trim() !== 'Inntekt') {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    }
    return acc;
  }, {});

  // Compute total sum for percentage calculation
  const totalSum = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);

  // Convert category totals into Recharts-friendly format and sort by size (biggest first)
  const data = Object.entries(categoryTotals)
    .map(([category, total]) => ({
      name: category,
      size: total,
      color: CATEGORY_COLORS[category] || '#CCCCCC', // Default gray for unknown categories
      percentage: totalSum > 0 ? (total / totalSum) * 100 : 0, // Compute percentage
    }))
    .sort((a, b) => b.size - a.size); // Sort from biggest to smallest

  return (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={data}
        dataKey="size"
        stroke="#fff"
        fill="#8884d8"
        content={<CustomTreeMapContent />}
        animationDuration={0} // Disable animation
      >
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
};

// Custom Tooltip to Remove Colon
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, size, percentage } = payload[0].payload;
    return (
      <div style={{
        background: 'white',
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <strong>{name}</strong> <br />
        {formatNumber(size)} ({percentage.toFixed(2)}%)
      </div>
    );
  }
  return null;
};

// Helper function to format amount in thousands
const formatAmountInK = (amount) => {
  const thousands = amount / 1000;
  return `${Math.round(thousands)}k kr`;
};

// Custom content renderer for Treemap
const CustomTreeMapContent = ({ root, depth, x, y, width, height, index, name }) => {
  if (depth === 1) {
    const percentageValue = root.children[index].percentage;
    const percentage = percentageValue.toFixed(1) + "%";
    const amount = root.children[index].size;
    const amountText = formatAmountInK(amount);
    const showDetails = percentageValue >= 5; // Only show details if >= 5%

    return (
      <g transform={`translate(${x},${y})`}>
        <rect width={width} height={height} fill={root.children[index].color} stroke="#fff" />
        {width > 60 && height > 40 && (
          <>
            <text x={width / 2} y={height / 2 - 15} textAnchor="middle" fill="#fff" fontSize={14}>
              {name}
            </text>
            {showDetails && (
              <>
                <text x={width / 2} y={height / 2 + 5} textAnchor="middle" fill="#fff" fontSize={13}>
                  {amountText}
                </text>
                <text x={width / 2} y={height / 2 + 22} textAnchor="middle" fill="#fff" fontSize={11} opacity={0.9}>
                  ({percentage})
                </text>
              </>
            )}
          </>
        )}
      </g>
    );
  }
  return null;
};

// Helper function to format numbers with commas
const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

export default TreeMapView;
