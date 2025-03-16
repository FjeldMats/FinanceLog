# Use the official PostgreSQL image
FROM postgres:latest

# Copy initialization SQL script
COPY init/ /docker-entrypoint-initdb.d/

# Copy data files to the container
COPY data/ /data/
