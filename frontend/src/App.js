import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import './App.css';
import axios from 'axios';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/login`,
        { username, password },
        { withCredentials: true } // added withCredentials option
      );
      if (response.status === 200) {
        onLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
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
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check session on page load
    const checkSession = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/session`, { withCredentials: true });
        setIsAuthenticated(response.data.logged_in);
      } catch (err) {
        console.error('Error checking session:', err);
      }
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/logout`, {}, { withCredentials: true });
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  return (
    <Router>
      <div>
        <header>
          <h1>Finance Tracker</h1>
          {isAuthenticated && (
            <nav className="nav-bar">
              <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active-link' : 'nav-link')} end>
                Dashboard
              </NavLink>
              <NavLink to="/add-transaction" className={({ isActive }) => (isActive ? 'nav-link active-link' : 'nav-link')}>
                Add Transaction
              </NavLink>
              <NavLink to="/transactions" className={({ isActive }) => (isActive ? 'nav-link active-link' : 'nav-link')}>
                View Transactions
              </NavLink>
              <button onClick={handleLogout} className="logout-button">Logout</button>
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
