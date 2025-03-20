CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Only create the table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        CREATE TABLE transactions (
            id SERIAL PRIMARY KEY,
            transaction_date DATE NOT NULL,
            category VARCHAR(255) NOT NULL,
            subcategory VARCHAR(255),
            description TEXT,
            amount NUMERIC(10, 2) NOT NULL
        );

        -- Ingest data only if the table was created
        COPY transactions(transaction_date, category, subcategory, description, amount)
        FROM '/data/2023_cleaned.csv'
        WITH (FORMAT csv, HEADER true, DELIMITER ',');

        COPY transactions(transaction_date, category, subcategory, description, amount)
        FROM '/data/2024_cleaned.csv'
        WITH (FORMAT csv, HEADER true, DELIMITER ',');

        COPY transactions(transaction_date, category, subcategory, description, amount)
        FROM '/data/2025_cleaned.csv'
        WITH (FORMAT csv, HEADER true, DELIMITER ',');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

-- Insert default admin user
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
        INSERT INTO users (username, password_hash)
        VALUES ('admin', crypt('password', gen_salt('bf')));
    END IF;
END $$;
