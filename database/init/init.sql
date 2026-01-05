-- ============================================
-- Create users table
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Create indexes for users table
-- ============================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- Create transactions table with user_id
-- ============================================
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL,
    category VARCHAR(255) NOT NULL,
    subcategory VARCHAR(255),
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    user_id INTEGER NOT NULL,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- Create index for transactions
-- ============================================
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

-- ============================================
-- Create default user
-- ============================================
-- Username: Jan
-- Password hash generated with passlib scrypt
INSERT INTO users (username, email, password_hash, created_at, updated_at)
VALUES (
    'Jan',
    'jan@financelog.local',
    '$scrypt$ln=16,r=8,p=1$0tobA+C8F4LQeo8RYkzp/Q$nr0dpXRSGAwT4zBUB4odpSEqwmO1uRO3DlI1AjVkD3o',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
