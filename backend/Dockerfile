# Use the official Python image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy only requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies (this layer will be cached unless requirements.txt changes)
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Add build argument for cache busting when code changes
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}

# Copy the application code (this invalidates cache only when source code changes)
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["python", "run.py"]
