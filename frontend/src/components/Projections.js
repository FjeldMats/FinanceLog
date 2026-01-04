import { useState, useEffect, useRef } from 'react';
import { getTransactions, getProjections } from '../api';
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Area, ComposedChart } from 'recharts';

// Fullscreen Chart Container Component
const ChartContainer = ({ title, subtitle, children, height = 300 }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-table rounded-lg shadow p-6"
      style={isFullscreen ? {
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f9f9f9'
      } : {}}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-primary">
            {title}
            {subtitle && <span className="ml-2 text-sm">{subtitle}</span>}
          </h2>
        </div>
        <button
          onClick={toggleFullscreen}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            // Exit fullscreen icon
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            // Enter fullscreen icon
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>
      <div style={isFullscreen ? { flex: 1, minHeight: 0 } : {}}>
        <ResponsiveContainer width="100%" height={isFullscreen ? '100%' : height}>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Projections = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState({});
  const [prophetProjections, setProphetProjections] = useState({});
  const [loadingProjections, setLoadingProjections] = useState(false);

  useEffect(() => {
    const loadTransactions = async () => {
      const data = await getTransactions();
      setTransactions(data);
    };
    loadTransactions();
  }, []);

  // Dynamically derive category structure from transactions
  useEffect(() => {
    if (transactions.length === 0) return;

    const categoryMap = {};
    const categoryCounts = {};
    const categoryTotals = {};

    transactions.forEach(tx => {
      const category = tx.category?.trim();
      const subcategory = tx.subcategory?.trim();

      // Skip if no category or if it's income (handled separately)
      if (!category || category === 'Inntekt') return;

      // Initialize category
      if (!categoryMap[category]) {
        categoryMap[category] = new Set();
        categoryCounts[category] = 0;
        categoryTotals[category] = 0;
      }

      // Track subcategories
      if (subcategory) {
        categoryMap[category].add(subcategory);
      }

      // Count transactions and total spending
      categoryCounts[category]++;
      categoryTotals[category] += Math.abs(tx.amount);
    });

    // Filter out categories with too little data (need at least 12 transactions)
    const MIN_TRANSACTIONS = 12;
    const filteredCategories = {};

    Object.keys(categoryMap).forEach(cat => {
      if (categoryCounts[cat] >= MIN_TRANSACTIONS) {
        filteredCategories[cat] = {
          subcategories: Array.from(categoryMap[cat]),
          total: categoryTotals[cat],
          count: categoryCounts[cat]
        };
      }
    });

    setCategories(filteredCategories);
  }, [transactions]);

  // Load Prophet projections for all categories + Income
  useEffect(() => {
    const loadProphetProjections = async () => {
      if (Object.keys(categories).length === 0) return;

      setLoadingProjections(true);
      const projections = {};

      // Load projections for all expense categories
      for (const category of Object.keys(categories)) {
        try {
          const data = await getProjections(category);
          projections[category] = data;
        } catch (error) {
          console.error(`Failed to load projections for ${category}:`, error);
          // If Prophet fails, we'll fall back to simple averaging
          projections[category] = null;
        }
      }

      // Also load projections for Income (Inntekt)
      try {
        const incomeData = await getProjections('Inntekt');
        projections['Inntekt'] = incomeData;
      } catch (error) {
        console.error('Failed to load projections for Income:', error);
        projections['Inntekt'] = null;
      }

      setProphetProjections(projections);
      setLoadingProjections(false);
    };

    loadProphetProjections();
  }, [categories]);

  // Calculate category data with historical months + 12 month projection
  const getCategoryChartData = () => {
    if (Object.keys(categories).length === 0) {
      return { chartDataByCategory: {}, incomeChartData: [], expenseChartData: [] };
    }

    const categoryData = {};
    const currentMonthData = {};
    const incomeData = {};
    const expenseData = {};
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;

    // Initialize category tracking for all dynamic categories
    Object.keys(categories).forEach(cat => {
      categoryData[cat] = {};
      currentMonthData[cat] = 0;
    });

    // Get current month
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    // Aggregate transactions by category and month
    transactions.forEach(tx => {
      const date = new Date(tx.transaction_date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

      const category = tx.category?.trim();
      if (!category) return;

      // Track income and expenses separately
      const isIncome = category === 'Inntekt';
      const amount = Math.abs(tx.amount);

      // Track current month income/expense
      if (monthKey === currentMonthKey) {
        if (isIncome) {
          currentMonthIncome += amount;
        } else {
          currentMonthExpense += amount;
        }
      } else {
        // Track historical income/expense
        if (isIncome) {
          if (!incomeData[monthKey]) incomeData[monthKey] = 0;
          incomeData[monthKey] += amount;
        } else {
          if (!expenseData[monthKey]) expenseData[monthKey] = 0;
          expenseData[monthKey] += amount;
        }
      }

      // Skip income for category breakdown (handled separately)
      if (isIncome) return;

      // Skip if not in our dynamic category list
      if (!categoryData[category]) {
        return;
      }

      // Track current month separately
      if (monthKey === currentMonthKey) {
        currentMonthData[category] += amount;
        return;
      }

      // Initialize month for this category if needed
      if (!categoryData[category][monthKey]) {
        categoryData[category][monthKey] = 0;
      }

      // Add to category total
      categoryData[category][monthKey] += amount;
    });

    // Calculate income and expense totals chart data
    const incomeMonths = Object.keys(incomeData).sort();
    const expenseMonths = Object.keys(expenseData).sort();

    // Calculate averages
    let totalIncome = 0;
    incomeMonths.forEach(month => {
      totalIncome += incomeData[month] || 0;
    });
    const avgIncome = incomeMonths.length > 0 ? totalIncome / incomeMonths.length : 0;

    let totalExpense = 0;
    expenseMonths.forEach(month => {
      totalExpense += expenseData[month] || 0;
    });
    const avgExpense = expenseMonths.length > 0 ? totalExpense / expenseMonths.length : 0;

    // Get all unique months
    const allMonths = [...new Set([...incomeMonths, ...expenseMonths])].sort();

    // Build income chart data with Prophet projections
    const incomeChartData = [];
    const incomeProphetData = prophetProjections['Inntekt'];

    allMonths.forEach(month => {
      incomeChartData.push({
        month: month,
        actual: incomeData[month] || 0,
        current: null,
        projected: null,
        prophetProjected: null,
        prophetLower: null,
        prophetUpper: null,
        prophetRange: null,
        isProjection: false,
        isCurrent: false
      });
    });

    // Get current month projection from Prophet if available
    const currentMonthIncomeProjection = incomeProphetData?.projected?.find(
      p => p.date === currentMonthKey
    );
    const currentIncomeProphetRange = currentMonthIncomeProjection
      ? currentMonthIncomeProjection.upper - currentMonthIncomeProjection.lower
      : null;

    // Add current month for income
    incomeChartData.push({
      month: currentMonthKey,
      actual: null,
      current: currentMonthIncome,
      projected: null,
      prophetProjected: currentMonthIncomeProjection ? currentMonthIncomeProjection.value : null,
      prophetLower: currentMonthIncomeProjection ? currentMonthIncomeProjection.lower : null,
      prophetUpper: currentMonthIncomeProjection ? currentMonthIncomeProjection.upper : null,
      prophetRange: currentIncomeProphetRange,
      isProjection: false,
      isCurrent: true
    });

    // Add 12 month projection for income
    const [year, month] = currentMonthKey.split('-').map(Number);
    const futureIncomeProjections = incomeProphetData?.projected?.filter(
      p => p.date > currentMonthKey
    ) || [];

    if (incomeProphetData && futureIncomeProjections.length > 0) {
      // Use Prophet projections
      futureIncomeProjections.forEach(proj => {
        const range = proj.upper - proj.lower;
        incomeChartData.push({
          month: proj.date,
          actual: null,
          current: null,
          projected: null,
          prophetProjected: proj.value,
          prophetLower: proj.lower,
          prophetUpper: proj.upper,
          prophetRange: range,
          isProjection: true,
          isCurrent: false
        });
      });
    } else {
      // Fallback to simple average
      for (let i = 1; i <= 12; i++) {
        const projDate = new Date(year, month - 1 + i, 1);
        const projMonthKey = `${projDate.getFullYear()}-${(projDate.getMonth() + 1).toString().padStart(2, '0')}`;

        incomeChartData.push({
          month: projMonthKey,
          actual: null,
          current: null,
          projected: avgIncome,
          prophetProjected: null,
          prophetLower: null,
          prophetUpper: null,
          prophetRange: null,
          isProjection: true,
          isCurrent: false
        });
      }
    }

    // Build expense chart data by aggregating all expense category projections
    const expenseChartData = [];

    // Historical data
    allMonths.forEach(month => {
      expenseChartData.push({
        month: month,
        actual: expenseData[month] || 0,
        current: null,
        projected: null,
        prophetProjected: null,
        prophetLower: null,
        prophetUpper: null,
        prophetRange: null,
        isProjection: false,
        isCurrent: false
      });
    });

    // Aggregate Prophet projections from all expense categories
    const aggregateExpenseProjections = (monthKey) => {
      let totalProjected = 0;
      let totalLower = 0;
      let totalUpper = 0;
      let hasAnyProjection = false;

      Object.keys(categories).forEach(category => {
        const catProphet = prophetProjections[category];
        if (catProphet?.projected) {
          const projection = catProphet.projected.find(p => p.date === monthKey);
          if (projection) {
            totalProjected += projection.value;
            totalLower += projection.lower;
            totalUpper += projection.upper;
            hasAnyProjection = true;
          }
        }
      });

      return hasAnyProjection ? {
        value: totalProjected,
        lower: totalLower,
        upper: totalUpper,
        range: totalUpper - totalLower
      } : null;
    };

    // Current month with aggregated projections
    const currentMonthExpenseProj = aggregateExpenseProjections(currentMonthKey);

    expenseChartData.push({
      month: currentMonthKey,
      actual: null,
      current: currentMonthExpense,
      projected: null,
      prophetProjected: currentMonthExpenseProj?.value || null,
      prophetLower: currentMonthExpenseProj?.lower || null,
      prophetUpper: currentMonthExpenseProj?.upper || null,
      prophetRange: currentMonthExpenseProj?.range || null,
      isProjection: false,
      isCurrent: true
    });

    // Future projections
    for (let i = 1; i <= 12; i++) {
      const projDate = new Date(year, month - 1 + i, 1);
      const projMonthKey = `${projDate.getFullYear()}-${(projDate.getMonth() + 1).toString().padStart(2, '0')}`;
      const futureExpenseProj = aggregateExpenseProjections(projMonthKey);

      expenseChartData.push({
        month: projMonthKey,
        actual: null,
        current: null,
        projected: futureExpenseProj ? null : avgExpense,
        prophetProjected: futureExpenseProj?.value || null,
        prophetLower: futureExpenseProj?.lower || null,
        prophetUpper: futureExpenseProj?.upper || null,
        prophetRange: futureExpenseProj?.range || null,
        isProjection: true,
        isCurrent: false
      });
    }

    // For each category, calculate average and add current month + 12 month projection
    const chartDataByCategory = {};

    Object.keys(categories).forEach(category => {
      const monthlyAmounts = categoryData[category];
      const months = Object.keys(monthlyAmounts).sort();
      const prophetData = prophetProjections[category];

      // Calculate average from all historical data (excluding current month) as fallback
      let total = 0;
      months.forEach(month => {
        total += monthlyAmounts[month] || 0;
      });
      const average = months.length > 0 ? total / months.length : 0;

      // Build chart data: historical + current month + 12 month projection
      const chartData = [];

      // Add historical data
      months.forEach(month => {
        chartData.push({
          month: month,
          actual: monthlyAmounts[month],
          current: null,
          projected: null,
          prophetProjected: null,
          prophetLower: null,
          prophetUpper: null,
          isProjection: false,
          isCurrent: false
        });
      });

      // Add current month (in progress) and projections
      const currentAmount = currentMonthData[category] || 0;

      // Check if Prophet data includes current month projection
      let currentMonthProjection = null;
      let futureProjections = [];

      if (prophetData && prophetData.projected && prophetData.projected.length > 0) {
        // Check if first projection is for current month
        const firstProjMonth = prophetData.projected[0].date;
        if (firstProjMonth === currentMonthKey) {
          // Current month has a projection
          currentMonthProjection = prophetData.projected[0];
          futureProjections = prophetData.projected.slice(1);
        } else {
          // All projections are for future months
          futureProjections = prophetData.projected;
        }
      }

      // Add current month with both actual (so far) and projection (full month)
      const currentProphetRange = currentMonthProjection
        ? currentMonthProjection.upper - currentMonthProjection.lower
        : null;

      chartData.push({
        month: currentMonthKey,
        actual: null,
        current: currentAmount,
        projected: null,
        prophetProjected: currentMonthProjection ? currentMonthProjection.value : null,
        prophetLower: currentMonthProjection ? currentMonthProjection.lower : null,
        prophetUpper: currentMonthProjection ? currentMonthProjection.upper : null,
        prophetRange: currentProphetRange,
        isProjection: false,
        isCurrent: true
      });

      // Add future month projections using Prophet if available, otherwise use simple average
      if (prophetData && futureProjections.length > 0) {
        // Use Prophet projections for future months
        futureProjections.forEach(proj => {
          const range = proj.upper - proj.lower;
          chartData.push({
            month: proj.date,
            actual: null,
            current: null,
            projected: null,
            prophetProjected: proj.value,
            prophetLower: proj.lower,
            prophetUpper: proj.upper,
            prophetRange: range,
            isProjection: true,
            isCurrent: false
          });
        });
      } else {
        // Fallback to simple average
        for (let i = 1; i <= 12; i++) {
          const projDate = new Date(year, month - 1 + i, 1);
          const projMonthKey = `${projDate.getFullYear()}-${(projDate.getMonth() + 1).toString().padStart(2, '0')}`;

          chartData.push({
            month: projMonthKey,
            actual: null,
            current: null,
            projected: average,
            prophetProjected: null,
            prophetLower: null,
            prophetUpper: null,
            isProjection: true,
            isCurrent: false
          });
        }
      }

      chartDataByCategory[category] = chartData;
    });

    return { chartDataByCategory, incomeChartData, expenseChartData };
  };

  const { chartDataByCategory, incomeChartData, expenseChartData } = getCategoryChartData();

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
      <p className="text-gray-600">
        Historical data (complete months only) with 12-month projections based on average.
        <span className="ml-2 text-sm">
          <span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span>Actual Data
          <span className="inline-block w-3 h-3 bg-orange-500 ml-3 mr-1"></span>Current Month (In Progress)
          <span className="inline-block w-3 h-3 bg-green-500 ml-3 mr-1"></span>Projected Average
        </span>
      </p>

      {/* Income and Expense Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Income Chart */}
        <ChartContainer title="Total Income">
          <ComposedChart data={incomeChartData}>
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
              formatter={(value, name) => [formatCurrency(value), name]}
              labelFormatter={formatMonth}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <Legend />

            {/* Confidence interval for income */}
            {incomeChartData.some(d => d.prophetProjected !== null) && (
              <>
                <Area
                  type="monotone"
                  dataKey="prophetLower"
                  stroke="none"
                  fill="transparent"
                  stackId="confidence"
                  legendType="none"
                />
                <Area
                  type="monotone"
                  dataKey="prophetRange"
                  stroke="none"
                  fill="#10b981"
                  fillOpacity={0.2}
                  stackId="confidence"
                  name="Confidence Range"
                />
              </>
            )}

            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={3}
              name="Actual Income"
              dot={{ r: 4, fill: '#3b82f6' }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#f97316"
              strokeWidth={3}
              name="Current Month"
              dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="prophetProjected"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Projected (AI)"
              dot={false}
              connectNulls={true}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Projected Average"
              dot={false}
              connectNulls={true}
            />
          </ComposedChart>
        </ChartContainer>

        {/* Total Expenses Chart */}
        <ChartContainer title="Total Expenses">
          <ComposedChart data={expenseChartData}>
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
              formatter={(value, name) => [formatCurrency(value), name]}
              labelFormatter={formatMonth}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <Legend />

            {/* Confidence interval for expenses */}
            {expenseChartData.some(d => d.prophetProjected !== null) && (
              <>
                <Area
                  type="monotone"
                  dataKey="prophetLower"
                  stroke="none"
                  fill="transparent"
                  stackId="confidence"
                  legendType="none"
                />
                <Area
                  type="monotone"
                  dataKey="prophetRange"
                  stroke="none"
                  fill="#10b981"
                  fillOpacity={0.2}
                  stackId="confidence"
                  name="Confidence Range"
                />
              </>
            )}

            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={3}
              name="Actual Expenses"
              dot={{ r: 4, fill: '#3b82f6' }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#f97316"
              strokeWidth={3}
              name="Current Month"
              dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="prophetProjected"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Projected (AI)"
              dot={false}
              connectNulls={true}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Projected Average"
              dot={false}
              connectNulls={true}
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      {/* Category Charts */}
      <h2 className="text-2xl font-bold text-primary mt-8">Category Breakdown</h2>
      {Object.keys(categories)
        .sort((a, b) => categories[b].total - categories[a].total) // Sort by total spending (highest first)
        .map(category => {
          const chartData = chartDataByCategory[category] || [];

          const hasProphetData = prophetProjections[category] && prophetProjections[category].projected;

          const subtitle = hasProphetData
            ? <span className="text-green-600">✨ AI-Powered</span>
            : loadingProjections
            ? <span className="text-gray-500">Loading...</span>
            : null;

          return (
            <ChartContainer
              key={category}
              title={category}
              subtitle={subtitle}
            >
              <ComposedChart data={chartData}>
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
                  formatter={(value, name) => {
                    if (name === "Current Month (In Progress)") {
                      return [formatCurrency(value), name];
                    }
                    if (name === "Confidence Range") {
                      return null; // Don't show the area in tooltip
                    }
                    return [formatCurrency(value), name];
                  }}
                  labelFormatter={formatMonth}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
                <Legend />

                {/* Confidence interval area (only for Prophet) */}
                {/* Use stacked areas: invisible lower bound + visible range */}
                {hasProphetData && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="prophetLower"
                      stroke="none"
                      fill="transparent"
                      stackId="confidence"
                      legendType="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="prophetRange"
                      stroke="none"
                      fill="#10b981"
                      fillOpacity={0.2}
                      stackId="confidence"
                      name="Confidence Range"
                    />
                  </>
                )}

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
                  dataKey="current"
                  stroke="#f97316"
                  strokeWidth={3}
                  name="Current Month (In Progress)"
                  dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                  connectNulls={false}
                />

                {/* Prophet projection or simple average */}
                {hasProphetData ? (
                  <Line
                    type="monotone"
                    dataKey="prophetProjected"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="AI Projection (Prophet)"
                    dot={false}
                    connectNulls={true}
                  />
                ) : (
                  <Line
                    type="monotone"
                    dataKey="projected"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Simple Average"
                    dot={false}
                    connectNulls={true}
                  />
                )}
              </ComposedChart>
            </ChartContainer>
          );
        })}
    </div>
  );
};

export default Projections;
