import React, { useState, useEffect } from 'react';
import { getTransactions } from '../api';

const CATEGORY_OPTIONS = {
  Hus: ['Lån Storebrand', 'Eindomskatt  (moss kommune)', 'Renovasjon (moss kommune)', 'Gjensidige forsikring hus'],
  'Faste utgifter': ['Telia telefon', 'Telia internett/Tv', 'Strøm'],
  Personelig: ['Spenst', 'Klær', 'Sparing'],
  Mat: ['Rema 1000', 'Kiwi', 'Spar', 'Meny','Obs', 'Bunnpris', 'Willis', 'Nordby', 'Div butikk'],
  Transport: ['Bensin', 'Toyota lån', 'Parkering', 'Gejensidige forsikring', 'Service', 'Bompenger'],
  Andre: ['Gaver', 'Hage', 'Andre']
};

const Months = [1,2,3,4,5,6,7,8,9,10,11,12];

const Categories = () => {
  const [transactions, setTransactions] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [breakdownCategory, setBreakdownCategory] = useState('Mat');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const data = await getTransactions(); // fetch all transactions
        setTransactions(data);
        // derive unique years from transaction dates
        const years = Array.from(new Set(data.map(t => new Date(t.transaction_date).getFullYear())));
        years.sort((a, b) => a - b); // ascending order
        setAvailableYears(years);
        if (!years.includes(selectedYear) && years.length > 0) {
          setSelectedYear(years[0]);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };
    fetchTransactions();
  }, []);

  const aggregateData = () => {
    const result = {};
    Object.keys(CATEGORY_OPTIONS).forEach(mainCat => {
      result[mainCat] = {};
      Months.forEach(month => {
        result[mainCat][month] = 0;
      });
    });
    transactions
      .filter(t => new Date(t.transaction_date).getFullYear() === selectedYear)
      .forEach(t => {
        const date = new Date(t.transaction_date);
        const month = date.getMonth() + 1;
        const amount = parseFloat(t.amount);
        for (let mainCat in CATEGORY_OPTIONS) {
          // Check if the transaction's main category matches or its subcategory matches the options
          if (
            t.category.toLowerCase() === mainCat.toLowerCase() ||
            (t.subcategory && CATEGORY_OPTIONS[mainCat].some(cat => cat.toLowerCase() === t.subcategory.toLowerCase()))
          ) {
            result[mainCat][month] += amount;
            break;
          }
        }
      });
    return result;
  };

  // Add new helper to aggregate data for Mat subcategories
  const aggregateMatData = () => {
    const result = {};
    // initialize each subcategory row with months
    CATEGORY_OPTIONS['Mat'].forEach(subcat => {
      result[subcat] = {};
      Months.forEach(month => {
        result[subcat][month] = 0;
      });
    });
    transactions
      .filter(t => new Date(t.transaction_date).getFullYear() === selectedYear)
      .forEach(t => {
        if (t.subcategory) {
          // check if the transaction subcategory (ignoring case) matches one of Mat's options
          const found = CATEGORY_OPTIONS['Mat'].find(s => s.toLowerCase() === t.subcategory.toLowerCase());
          if (found) {
            const month = new Date(t.transaction_date).getMonth() + 1;
            result[found][month] += parseFloat(t.amount);
          }
        }
      });
    return result;
  };

  // New helper to aggregate data for any main category's subcategories
  const aggregateSubData = (mainCat) => {
    const result = {};
    const subCategories = CATEGORY_OPTIONS[mainCat];
    
    // Add "Uncategorized" to track unmatched transactions
    result["Uncategorized"] = {};
    Months.forEach(month => {
        result["Uncategorized"][month] = 0;
    });

    // Initialize regular subcategories
    subCategories.forEach(subcat => {
        result[subcat] = {};
        Months.forEach(month => {
            result[subcat][month] = 0;
        });
    });

    transactions
        .filter(t => {
            // Filter transactions by main category AND selected year
            const transactionYear = new Date(t.transaction_date).getFullYear();
            return t.category.toLowerCase() === mainCat.toLowerCase() && 
                   transactionYear === selectedYear;
        })
        .forEach(t => {
            const month = new Date(t.transaction_date).getMonth() + 1;
            const amount = parseFloat(t.amount);

            if (t.subcategory) {
                // Try to find matching subcategory
                const found = subCategories.find(s => 
                    s.toLowerCase() === t.subcategory.toLowerCase()
                );
                if (found) {
                    result[found][month] += amount;
                } else {
                    // If no matching subcategory found, add to Uncategorized
                    result["Uncategorized"][month] += amount;
                }
            } else {
                // If no subcategory provided, add to Uncategorized
                result["Uncategorized"][month] += amount;
            }
        });

    return result;
  };

  // In the aggregateData function, add a new function for income data
  const aggregateIncomeData = () => {
    const result = {};
    Months.forEach(month => {
      result[month] = 0;
    });

    transactions
      .filter(t => new Date(t.transaction_date).getFullYear() === selectedYear)
      .forEach(t => {
        if (t.category.toLowerCase() === 'inntekt') {
          const date = new Date(t.transaction_date);
          const month = date.getMonth() + 1;
          result[month] += parseFloat(t.amount);
        }
      });
    return result;
  };

  const data = aggregateData();
  
  return (
    <div className="p-5 m-5 w-[95%] mx-auto bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
      <h2 className="text-2xl font-bold mb-4">Categories</h2>
      
      {/* Year Buttons */}
      <div className="flex flex-wrap justify-center gap-2 mb-4 w-full">
        {availableYears.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-4 py-2 rounded-md transition-colors duration-200 
              ${year === selectedYear 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 hover:bg-green-500 hover:text-white'}`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <h3 className="text-xl font-semibold mt-8 mb-4">Expenses</h3>
      <div className="overflow-x-auto">
        <table className="w-full mb-10 border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-3 text-left font-semibold border border-gray-200 min-w-[150px] whitespace-nowrap">Category</th>
              {Months.map(month => (
                <th key={month} className="p-3 text-center font-semibold border border-gray-200">
                  {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                </th>
              ))}
              <th className="p-3 text-center font-semibold border border-gray-200 border-l-2 border-l-gray-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(CATEGORY_OPTIONS).map(mainCat => (
              <tr key={mainCat} className="hover:bg-gray-50">
                <td className="p-3 border border-gray-200">{mainCat}</td>
                {Months.map(month => (
                  <td key={month} className="p-3 text-right border border-gray-200">
                    {Math.round(data[mainCat][month]).toLocaleString('fr-FR')}
                  </td>
                ))}
                <td className="p-3 text-right border border-gray-200 border-l-2 border-l-gray-400">
                  {Math.round(Months.reduce((sum, m) => sum + data[mainCat][m], 0)).toLocaleString('fr-FR')}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="p-3 border border-gray-200">Total</td>
              {Months.map(month => (
                <td key={month} className="p-3 text-right border border-gray-200">
                  {Math.round(Object.keys(CATEGORY_OPTIONS).reduce((sum, cat) => sum + data[cat][month], 0)).toLocaleString('fr-FR')}
                </td>
              ))}
              <td className="p-3 text-right border border-gray-200 border-l-2 border-l-gray-400">
                {Math.round(Months.reduce((total, m) => total + Object.keys(CATEGORY_OPTIONS).reduce((sum, cat) => sum + data[cat][m], 0), 0)).toLocaleString('fr-FR')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Income Table */}
      <h3 className="text-xl font-semibold mt-8 mb-4">Income</h3>
      <div className="overflow-x-auto">
        <table className="w-full mb-10 border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-3 text-left font-semibold border border-gray-200 min-w-[150px]">Category</th>
              {Months.map(month => (
                <th key={month} className="p-3 text-center font-semibold border border-gray-200">
                  {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                </th>
              ))}
              <th className="p-3 text-center font-semibold border border-gray-200 border-l-2 border-l-gray-400">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50">
              <td className="p-3 border border-gray-200">Income</td>
              {Months.map(month => (
                <td key={month} className="p-3 text-right border border-gray-200">
                  {Math.round(aggregateIncomeData()[month]).toLocaleString('fr-FR')}
                </td>
              ))}
              <td className="p-3 text-right border border-gray-200 border-l-2 border-l-gray-400">
                {Math.round(Months.reduce((sum, m) => sum + aggregateIncomeData()[m], 0)).toLocaleString('fr-FR')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Subcategory Breakdown */}
      <h2 className="text-2xl font-bold mt-8 mb-4">Subcategory Breakdown</h2>
      <div className="flex flex-wrap justify-center gap-2 mb-4 w-full">
        {Object.keys(CATEGORY_OPTIONS).map(mainCat => (
          <button
            key={mainCat}
            onClick={() => setBreakdownCategory(mainCat)}
            className={`px-4 py-2 rounded-md transition-colors duration-200 
              ${breakdownCategory === mainCat 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 hover:bg-green-500 hover:text-white'}`}
          >
            {mainCat}
          </button>
        ))}
      </div>

      {breakdownCategory && (
        (() => {
          const subData = aggregateSubData(breakdownCategory);
          return (
            <div className="mt-4">
              <h3 className="text-xl font-semibold mb-4">{breakdownCategory} Subcategories</h3>
              <div className="overflow-x-auto">
                <table className="w-full mb-10 border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left font-semibold border border-gray-200 min-w-[150px]">Sub Category</th>
                      {Months.map(month => (
                        <th key={month} className="p-3 text-center font-semibold border border-gray-200">
                          {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                        </th>
                      ))}
                      <th className="p-3 text-center font-semibold border border-gray-200 border-l-2 border-l-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...CATEGORY_OPTIONS[breakdownCategory], "Uncategorized"].map(subcat => (
                      <tr key={subcat} className="hover:bg-gray-50">
                        <td className="p-3 border border-gray-200">{subcat}</td>
                        {Months.map(month => (
                          <td key={month} className="p-3 text-right border border-gray-200">
                            {Math.round(subData[subcat][month]).toLocaleString('fr-FR')}
                          </td>
                        ))}
                        <td className="p-3 text-right border border-gray-200 border-l-2 border-l-gray-400">
                          {Math.round(Months.reduce((sum, m) => sum + subData[subcat][m], 0)).toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="p-3 border border-gray-200">Total</td>
                      {Months.map(month => (
                        <td key={month} className="p-3 text-right border border-gray-200">
                          {Math.round(
                            [...CATEGORY_OPTIONS[breakdownCategory], "Uncategorized"].reduce(
                              (sum, subcat) => sum + subData[subcat][month],
                              0
                            )
                          ).toLocaleString('fr-FR')}
                        </td>
                      ))}
                      <td className="p-3 text-right border border-gray-200 border-l-2 border-l-gray-400">
                        {Math.round(
                          Months.reduce(
                            (total, m) =>
                              total +
                              [...CATEGORY_OPTIONS[breakdownCategory], "Uncategorized"].reduce(
                                (sum, subcat) => sum + subData[subcat][m],
                                0
                              ),
                            0
                          )
                        ).toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
};

export default Categories;
