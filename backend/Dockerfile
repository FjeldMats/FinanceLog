# Use the official Python image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies for Prophet
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy the application code
COPY . .

# Install dependencies
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Install cmdstan for Prophet
RUN python -c "from cmdstanpy import install_cmdstan; install_cmdstan()"

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["python", "run.py"]
