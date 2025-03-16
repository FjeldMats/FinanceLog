import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import './App.css';

const App = () => {
  return (
    <Router>
      <div>
        <header>
          <h1>Finance Tracker</h1>
          <nav className="nav-bar">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? 'nav-link active-link' : 'nav-link'
              }
              end
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/add-transaction"
              className={({ isActive }) =>
                isActive ? 'nav-link active-link' : 'nav-link'
              }
            >
              Add Transaction
            </NavLink>
            <NavLink
              to="/transactions"
              className={({ isActive }) =>
                isActive ? 'nav-link active-link' : 'nav-link'
              }
            >
              View Transactions
            </NavLink>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-transaction" element={<TransactionForm />} />
            <Route path="/transactions" element={<TransactionTable />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
