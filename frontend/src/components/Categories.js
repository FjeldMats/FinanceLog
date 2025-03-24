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

  const data = aggregateData();
  
  return (
    // Removed inline margin style from container
    <div className="categories-container">
      <h2>Categories</h2>
      <div className="year-buttons">
        {availableYears.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`year-button ${year === selectedYear ? 'active' : ''}`}
          >
            {year}
          </button>
        ))}
      </div>
      <table className="categories-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Category</th>
            {Months.map(month => (
              <th key={month}>
                {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
              </th>
            ))}
            {/* New Total header with separation */}
            <th style={{ borderLeft: '2px solid black' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(CATEGORY_OPTIONS).map(mainCat => (
            <tr key={mainCat}>
              <td>{mainCat}</td>
              {Months.map(month => (
                <td key={month}>
                  {Math.round(data[mainCat][month]).toLocaleString('fr-FR')}
                </td>
              ))}
              {/* New Total cell for the category */}
              <td style={{ borderLeft: '2px solid black' }}>
                {Math.round(Months.reduce((sum, m) => sum + data[mainCat][m], 0)).toLocaleString('fr-FR')}
              </td>
            </tr>
          ))}
          {/* New row for monthly totals */}
          <tr>
            <td style={{ fontWeight: 'bold' }}>Total</td>
            {Months.map(month => (
              <td key={month} style={{ fontWeight: 'bold' }}>
                {Math.round(Object.keys(CATEGORY_OPTIONS).reduce((sum, cat) => sum + data[cat][month], 0)).toLocaleString('fr-FR')}
              </td>
            ))}
            <td style={{ borderLeft: '2px solid black', fontWeight: 'bold' }}>
              {Math.round(Months.reduce((total, m) => total + Object.keys(CATEGORY_OPTIONS).reduce((sum, cat) => sum + data[cat][m], 0), 0)).toLocaleString('fr-FR')}
            </td>
          </tr>
        </tbody>
      </table>
      
      {/* New dynamic breakdown section */}
      <h2>Subcategory Breakdown</h2>
      <div className="breakdown-buttons">
        {Object.keys(CATEGORY_OPTIONS).map(mainCat => (
          <button
            key={mainCat}
            onClick={() => setBreakdownCategory(mainCat)}
            className={`breakdown-button ${breakdownCategory === mainCat ? 'active' : ''}`}
          >
            {mainCat}
          </button>
        ))}
      </div>
      {breakdownCategory && (
        (() => {
          const subData = aggregateSubData(breakdownCategory);
          return (
            <div>
              <h3>{breakdownCategory} Subcategories</h3>
              <table className="categories-table">
                <thead>
                  <tr>
                    <th>Sub Category</th>
                    {Months.map(month => (
                      <th key={month}>
                        {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                      </th>
                    ))}
                    <th style={{ borderLeft: '2px solid black' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...CATEGORY_OPTIONS[breakdownCategory], "Uncategorized"].map(subcat => (
                    <tr key={subcat}>
                      <td>{subcat}</td>
                      {Months.map(month => (
                        <td key={month}>
                          {Math.round(subData[subcat][month]).toLocaleString('fr-FR')}
                        </td>
                      ))}
                      <td style={{ borderLeft: '2px solid black' }}>
                        {Math.round(Months.reduce((sum, m) => sum + subData[subcat][m], 0)).toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>Total</td>
                    {Months.map(month => (
                      <td key={month} style={{ fontWeight: 'bold' }}>
                        {Math.round(
                          [...CATEGORY_OPTIONS[breakdownCategory], "Uncategorized"].reduce(
                            (sum, subcat) => sum + subData[subcat][month],
                            0
                          )
                        ).toLocaleString('fr-FR')}
                      </td>
                    ))}
                    <td style={{ borderLeft: '2px solid black', fontWeight: 'bold' }}>
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
          );
        })()
      )}
    </div>
  );
};

export default Categories;
