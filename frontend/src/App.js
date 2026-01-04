import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import Categories from './components/Categories';
import Projections from './components/Projections';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header>
      <nav className="flex justify-between items-center bg-background py-3 px-4 border-b-2 border-border">
        <div className="flex gap-5">
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
          <NavLink to="/projections"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active-link' : ''}`}>
            Projections
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
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Welcome, {user?.username}</span>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
};

const AppContent = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/add-transaction" element={
            <ProtectedRoute>
              <TransactionForm />
            </ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute>
              <TransactionTable />
            </ProtectedRoute>
          } />
          <Route path="/categories" element={
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          } />
          <Route path="/projections" element={
            <ProtectedRoute>
              <Projections />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
