# Use the official PostgreSQL image
FROM postgres:17

# Copy initialization SQL script
COPY init/ /docker-entrypoint-initdb.d/

# Copy data files to the container
COPY data/ /data/
