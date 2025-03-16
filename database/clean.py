import pandas as pd

# Function to clean a CSV file
def clean_csv(input_file, output_file):
    # Load the CSV
    df = pd.read_csv(input_file, delimiter=",", encoding="utf-8")

    # Drop the `Id` column
    if 'Id' in df.columns:
        df = df.drop(columns=['Id'])

    # Standardize the date format
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'], format='%d.%m.%Y', errors='coerce')  # Convert to datetime
        df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')  # Convert back to string in YYYY-MM-DD format

    # Clean the `Amount` column
    if 'Amount' in df.columns:
        df['Amount'] = (
            df['Amount']
            .replace({' kr': '', '\u00a0': '', ",": "."}, regex=True)  # Remove 'kr', spaces, and commas
            .astype(float, errors='ignore')  # Convert to float
        )

    # Drop rows with missing data in required fields
    df = df.dropna(subset=['Date', 'Category', 'Amount'])

    # Save the cleaned CSV
    df.to_csv(output_file, index=False)

# Clean both 2023.csv and 2024.csv
clean_csv('data/2023.csv', 'data/2023_cleaned.csv')
clean_csv('data/2024.csv', 'data/2024_cleaned.csv')
