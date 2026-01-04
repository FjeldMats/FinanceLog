# Authentication Implementation Plan

## Overview
Implement JWT-based authentication system for FinanceLog to support multi-user functionality with secure login/logout and user-specific transaction data.

## Architecture Decision: JWT vs Session-Based Auth

**Choice: JWT (JSON Web Tokens)**

### Why JWT?
- ✅ Stateless - no server-side session storage needed
- ✅ Scalable - works well with Docker/containerized deployments
- ✅ Simple - no Redis or session database required
- ✅ Mobile-ready - easy to extend to mobile apps later
- ✅ CORS-friendly - works seamlessly with separate frontend/backend

### JWT Flow
```
1. User logs in → Backend validates credentials
2. Backend generates JWT token (expires in 24h)
3. Frontend stores token in localStorage
4. Frontend sends token in Authorization header for all API requests
5. Backend validates token on each request
6. Token expires → User must re-login
```

---

## Phase 1: Database Schema Updates

### 1.1 Update Users Table
**File**: `database/init/init.sql`

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

### 1.2 Update Transactions Table
**File**: `database/init/init.sql`

```sql
-- Add user_id foreign key to transactions
ALTER TABLE transactions ADD COLUMN user_id INTEGER;
ALTER TABLE transactions ADD CONSTRAINT fk_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add index for faster user-specific queries
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

-- Make user_id NOT NULL after migration (for new installations)
-- For existing data, we'll need a migration strategy
```

### 1.3 Migration Strategy for Existing Data
- Create a default "admin" user
- Assign all existing transactions to this user
- Provide migration script for production deployment

---

## Phase 2: Backend Implementation

### 2.1 Install Dependencies
**File**: `backend/requirements.txt`

Add:
```
PyJWT==2.8.0
python-dotenv==1.0.0
```

### 2.2 Update Configuration
**File**: `backend/config.py`

```python
import os
from datetime import timedelta

class Config:
    # Existing config
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', '...')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key')
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_ALGORITHM = 'HS256'
```

### 2.3 Update User Model
**File**: `backend/app/models.py`

```python
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to transactions
    transactions = db.relationship('Transaction', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }
```

### 2.4 Update Transaction Model
**File**: `backend/app/models.py`

```python
class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    transaction_date = db.Column(db.Date, nullable=False)
    category = db.Column(db.String(255), nullable=False)
    subcategory = db.Column(db.String(255))
    description = db.Column(db.Text)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    
    # ... rest of existing methods ...
```

### 2.5 Create JWT Utility Functions
**File**: `backend/app/auth_utils.py` (NEW)

```python
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from app.models import User

def generate_token(user_id):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + current_app.config['JWT_ACCESS_TOKEN_EXPIRES'],
        'iat': datetime.utcnow()
    }
    token = jwt.encode(
        payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm=current_app.config['JWT_ALGORITHM']
    )
    return token

def decode_token(token):
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=[current_app.config['JWT_ALGORITHM']]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

def token_required(f):
    """Decorator to protect routes with JWT authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Invalid token format'}), 401

        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        # Decode token
        payload = decode_token(token)
        if not payload:
            return jsonify({'message': 'Token is invalid or expired'}), 401

        # Get user from database
        current_user = User.query.get(payload['user_id'])
        if not current_user:
            return jsonify({'message': 'User not found'}), 401

        # Pass current_user to the route
        return f(current_user, *args, **kwargs)

    return decorated

def get_current_user():
    """Get current user from request token (optional helper)"""
    token = None
    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return None

    if not token:
        return None

    payload = decode_token(token)
    if not payload:
        return None

    return User.query.get(payload['user_id'])
```

### 2.6 Create Authentication Routes
**File**: `backend/app/auth_routes.py` (NEW)

```python
from flask import Blueprint, request, jsonify
from app.models import User
from app import db
from app.auth_utils import generate_token, token_required
import re

auth_bp = Blueprint('auth', __name__)

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()

    # Validate required fields
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing required fields'}), 400

    username = data['username'].strip()
    email = data['email'].strip().lower()
    password = data['password']

    # Validate username
    if len(username) < 3:
        return jsonify({'message': 'Username must be at least 3 characters long'}), 400

    # Validate email
    if not validate_email(email):
        return jsonify({'message': 'Invalid email format'}), 400

    # Validate password
    is_valid, message = validate_password(password)
    if not is_valid:
        return jsonify({'message': message}), 400

    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already registered'}), 409

    # Create new user
    new_user = User(username=username, email=email)
    new_user.set_password(password)

    try:
        db.session.add(new_user)
        db.session.commit()

        # Generate token
        token = generate_token(new_user.id)

        return jsonify({
            'message': 'User registered successfully',
            'token': token,
            'user': new_user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error creating user: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Missing username or password'}), 400

    username = data['username'].strip()
    password = data['password']

    # Find user by username or email
    user = User.query.filter(
        (User.username == username) | (User.email == username.lower())
    ).first()

    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid username or password'}), 401

    # Generate token
    token = generate_token(user.id)

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user_info(current_user):
    """Get current user information"""
    return jsonify({
        'user': current_user.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """Logout user (client-side token removal)"""
    # With JWT, logout is handled client-side by removing the token
    # This endpoint is optional but can be used for logging/analytics
    return jsonify({'message': 'Logout successful'}), 200
```

### 2.7 Update Existing API Routes
**File**: `backend/app/routes.py`

**Changes needed:**
1. Import `token_required` decorator
2. Add `@token_required` to all transaction endpoints
3. Filter transactions by `current_user.id`
4. Set `user_id` when creating transactions

**Example:**
```python
from app.auth_utils import token_required

@api.route('/transactions', methods=['GET'])
@token_required
def get_transactions(current_user):
    """Get all transactions for the current user"""
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    category = request.args.get('category')

    # Base query filtered by user
    query = Transaction.query.filter_by(user_id=current_user.id)

    if year and month and category:
        transactions = query.filter(
            extract('year', Transaction.transaction_date) == year,
            extract('month', Transaction.transaction_date) == month,
            Transaction.category == category
        ).all()
    else:
        transactions = query.all()

    return jsonify([t.to_dict() for t in transactions])

@api.route('/transaction', methods=['POST'])
@token_required
def add_transaction(current_user):
    """Add a new transaction for the current user"""
    data = request.get_json()

    new_transaction = Transaction(
        user_id=current_user.id,  # Set user_id
        transaction_date=datetime.strptime(data['transaction_date'], '%Y-%m-%d').date(),
        category=data['category'],
        subcategory=data.get('subcategory'),
        description=data.get('description'),
        amount=data['amount']
    )

    db.session.add(new_transaction)
    db.session.commit()

    return jsonify(new_transaction.to_dict()), 201

# Similar updates for PUT and DELETE endpoints
```

### 2.8 Register Auth Blueprint
**File**: `backend/app/__init__.py`

```python
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    # Configure CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://10.0.0.29"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    # Register blueprints
    from app.routes import api
    from app.auth_routes import auth_bp

    app.register_blueprint(api, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    return app
```

---

## Phase 3: Frontend Implementation

### 3.1 Create Auth Context
**File**: `frontend/src/contexts/AuthContext.js` (NEW)

```javascript
import React, { createContext, useState, useContext, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, getCurrentUser } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const userData = await getCurrentUser(storedToken);
          setUser(userData);
          setToken(storedToken);
        } catch (error) {
          // Token invalid or expired
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await apiLogin(username, password);
      const { token, user } = response;

      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await apiRegister(username, email, password);
      const { token, user } = response;

      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 3.2 Create Login Component
**File**: `frontend/src/components/Login.js` (NEW)

```javascript
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-table p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-6 text-text">
          Login to FinanceLog
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-text mb-2">Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded bg-background text-text"
              required
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-text mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded bg-background text-text"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center mt-4 text-text">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
```

### 3.3 Create Register Component
**File**: `frontend/src/components/Register.js` (NEW)

```javascript
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await register(formData.username, formData.email, formData.password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-table p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-6 text-text">
          Create Account
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-text mb-2">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded bg-background text-text"
              required
              minLength={3}
            />
          </div>

          <div className="mb-4">
            <label className="block text-text mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded bg-background text-text"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-text mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded bg-background text-text"
              required
              minLength={8}
            />
            <p className="text-sm text-gray-500 mt-1">
              Must be 8+ characters with uppercase, lowercase, and number
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-text mb-2">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded bg-background text-text"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-center mt-4 text-text">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
```

### 3.4 Create Protected Route Component
**File**: `frontend/src/components/ProtectedRoute.js` (NEW)

```javascript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-text text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
```

### 3.5 Update API Client
**File**: `frontend/src/api.js`

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
};

export const register = async (username, email, password) => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data;
};

export const getCurrentUser = async (token) => {
  const response = await api.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.user;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

// Existing transaction endpoints (no changes needed - token added automatically)
export const fetchTransactions = async () => {
  const response = await api.get('/transactions');
  return response.data;
};

export const addTransaction = async (transaction) => {
  const response = await api.post('/transaction', transaction);
  return response.data;
};

export const updateTransaction = async (id, transaction) => {
  const response = await api.put(`/transaction/${id}`, transaction);
  return response.data;
};

export const deleteTransaction = async (id) => {
  const response = await api.delete(`/transaction/${id}`);
  return response.data;
};

export const fetchProjections = async (category) => {
  const response = await api.get(`/projections/${category}`);
  return response.data;
};
```

### 3.6 Update App.js
**File**: `frontend/src/App.js`

```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import Categories from './components/Categories';
import Projections from './components/Projections';

const AppContent = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated && (
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
              <span className="text-text">Welcome, {user?.username}</span>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </nav>
        </header>
      )}

      <main className="container mx-auto px-4 py-8">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Register />
          } />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/add-transaction" element={
            <ProtectedRoute><TransactionForm /></ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute><TransactionTable /></ProtectedRoute>
          } />
          <Route path="/categories" element={
            <ProtectedRoute><Categories /></ProtectedRoute>
          } />
          <Route path="/projections" element={
            <ProtectedRoute><Projections /></ProtectedRoute>
          } />
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
```

---

## Phase 4: Database Migration

### 4.1 Create Migration Script
**File**: `database/migrations/001_add_authentication.sql` (NEW)

```sql
-- Migration: Add authentication support
-- Run this on existing databases

BEGIN;

-- 1. Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Create default admin user (password: Admin123!)
-- IMPORTANT: Change this password after first login!
INSERT INTO users (username, email, password_hash)
VALUES (
    'admin',
    'admin@financelog.local',
    'scrypt:32768:8:1$...'  -- This will be generated during migration
)
ON CONFLICT (username) DO NOTHING;

-- 4. Add user_id column to transactions (allow NULL temporarily)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- 5. Assign all existing transactions to admin user
UPDATE transactions
SET user_id = (SELECT id FROM users WHERE username = 'admin')
WHERE user_id IS NULL;

-- 6. Add foreign key constraint
ALTER TABLE transactions
ADD CONSTRAINT IF NOT EXISTS fk_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 7. Make user_id NOT NULL
ALTER TABLE transactions
ALTER COLUMN user_id SET NOT NULL;

-- 8. Add index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

COMMIT;
```

### 4.2 Create Migration Runner Script
**File**: `database/migrations/run_migration.sh` (NEW)

```bash
#!/bin/bash

# Run database migration for authentication
# Usage: ./run_migration.sh

set -e

echo "=========================================="
echo "Running Authentication Migration"
echo "=========================================="

# Get database credentials from environment or use defaults
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-finance_tracker}
DB_USER=${POSTGRES_USER:-admin}

# Generate password hash for default admin user
echo "Generating password hash for default admin user..."
ADMIN_PASSWORD_HASH=$(python3 -c "
from werkzeug.security import generate_password_hash
print(generate_password_hash('Admin123!'))
")

# Replace placeholder in SQL file
sed "s|scrypt:32768:8:1\$\.\.\.|$ADMIN_PASSWORD_HASH|g" 001_add_authentication.sql > /tmp/migration.sql

# Run migration
echo "Applying migration to database..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/migration.sql

# Clean up
rm /tmp/migration.sql

echo "=========================================="
echo "✅ Migration completed successfully!"
echo ""
echo "Default admin credentials:"
echo "  Username: admin"
echo "  Password: Admin123!"
echo ""
echo "⚠️  IMPORTANT: Change the admin password after first login!"
echo "=========================================="
```

### 4.3 Update init.sql for Fresh Installations
**File**: `database/init/init.sql`

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    transaction_date DATE NOT NULL,
    category VARCHAR(255) NOT NULL,
    subcategory VARCHAR(255),
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
```

---

## Phase 5: Testing & Deployment

### 5.1 Testing Checklist

**Backend Tests:**
- [ ] User registration with valid data
- [ ] User registration with duplicate username/email
- [ ] User registration with weak password
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] JWT token generation and validation
- [ ] Protected routes require authentication
- [ ] Transactions filtered by user_id
- [ ] Token expiration handling

**Frontend Tests:**
- [ ] Login form validation
- [ ] Registration form validation
- [ ] Password confirmation matching
- [ ] Token storage in localStorage
- [ ] Automatic token inclusion in API requests
- [ ] Redirect to login when token expires
- [ ] Protected routes redirect to login
- [ ] Logout clears token and redirects

**Integration Tests:**
- [ ] End-to-end user registration → login → add transaction
- [ ] Multiple users with separate transaction data
- [ ] Token refresh on page reload
- [ ] CORS configuration works correctly

### 5.2 Deployment Steps

1. **Update Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Run Database Migration**
   ```bash
   cd database/migrations
   chmod +x run_migration.sh
   ./run_migration.sh
   ```

3. **Update Environment Variables**
   ```bash
   # Add to .env
   JWT_SECRET_KEY=<generate-new-64-char-hex-key>
   ```

4. **Rebuild Docker Images**
   ```bash
   docker compose down
   docker compose build
   docker compose up -d
   ```

5. **Test Authentication**
   - Visit http://10.0.0.29/login
   - Login with admin/Admin123!
   - Change admin password
   - Create new user account
   - Test transaction operations

### 5.3 Security Considerations

**Implemented:**
- ✅ Password hashing with Werkzeug (bcrypt-based)
- ✅ JWT token expiration (24 hours)
- ✅ Password strength validation
- ✅ Email format validation
- ✅ SQL injection protection (SQLAlchemy ORM)
- ✅ CORS configuration
- ✅ User-specific data isolation

**Future Enhancements:**
- [ ] HTTPS/SSL (production requirement)
- [ ] Rate limiting on login endpoint
- [ ] Account lockout after failed attempts
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] Refresh tokens for extended sessions
- [ ] Token blacklist for logout

---

## Phase 6: Documentation Updates

### 6.1 Update README.md
- Add authentication section
- Update API endpoints documentation
- Add setup instructions for auth
- Update architecture diagrams

### 6.2 Create User Guide
- How to register
- How to login
- Password requirements
- Data privacy (user-specific data)

---

## Summary

### Implementation Order:
1. ✅ **Phase 1**: Database schema updates
2. ✅ **Phase 2**: Backend authentication (JWT, routes, decorators)
3. ✅ **Phase 3**: Frontend authentication (context, components, routing)
4. ✅ **Phase 4**: Database migration for existing data
5. ✅ **Phase 5**: Testing and deployment
6. ✅ **Phase 6**: Documentation

### Estimated Timeline:
- **Phase 1-2 (Backend)**: 4-6 hours
- **Phase 3 (Frontend)**: 4-6 hours
- **Phase 4 (Migration)**: 2-3 hours
- **Phase 5 (Testing)**: 3-4 hours
- **Phase 6 (Docs)**: 1-2 hours
- **Total**: ~15-20 hours

### Key Benefits:
- 🔐 Secure multi-user support
- 🚀 Scalable JWT-based authentication
- 📊 User-specific transaction data
- 🎨 Clean, modern login/register UI
- 🔄 Seamless integration with existing features
- 📱 Mobile-ready architecture


