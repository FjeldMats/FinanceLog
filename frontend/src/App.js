import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import Categories from './components/Categories';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <header>
          <nav className="flex justify-center gap-5 bg-background py-3 px-4 border-b-2 border-border">
            <NavLink to="/" 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'active-link' : ''}`} 
              end>
              Dashboard
            </NavLink>
            <NavLink to="/categories" 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'active-link' : ''}`}>
              Categories
            </NavLink>
            <NavLink to="/add-transaction" 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'active-link' : ''}`}>
              Add Transaction
            </NavLink>
            <NavLink to="/transactions" 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'active-link' : ''}`}>
              View Transactions
            </NavLink>
          </nav>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-transaction" element={<TransactionForm />} />
            <Route path="/transactions" element={<TransactionTable />} />
            <Route path="/categories" element={<Categories />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
