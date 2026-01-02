CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL,
    category VARCHAR(255) NOT NULL,
    subcategory VARCHAR(255),
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL
);
