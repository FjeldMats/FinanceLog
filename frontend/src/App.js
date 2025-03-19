import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import './App.css';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple authentication logic (replace with real authentication if needed)
    if (username === 'admin' && password === 'password') {
      onLogin(true);
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <label>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Router>
      <div>
        <header>
          <h1>Finance Tracker</h1>
          {isAuthenticated && (
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
          )}
        </header>
        <main>
          <Routes>
            {!isAuthenticated ? (
              <Route path="*" element={<LoginPage onLogin={setIsAuthenticated} />} />
            ) : (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/add-transaction" element={<TransactionForm />} />
                <Route path="/transactions" element={<TransactionTable />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
