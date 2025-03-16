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
