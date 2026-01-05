# Build stage
FROM node:20-alpine as build
WORKDIR /app

# Copy package files (this layer will be cached unless package files change)
COPY package*.json ./

# Install dependencies (this layer will be cached unless package files change)
RUN npm install --legacy-peer-deps

# Add build argument for cache busting when code changes
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}

# Copy the rest of the application code (this invalidates cache only when source code changes)
COPY . .

# Set environment variable for production build
ENV REACT_APP_API_URL=/api

# Build the application for production
RUN npm run build

# Production stage
FROM nginx:alpine
# Copy the production build to the nginx html folder
COPY --from=build /app/build /usr/share/nginx/html
# Copy custom nginx config to enable client-side routing fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Expose port 80
EXPOSE 80
# Start nginx
CMD ["nginx", "-g", "daemon off;"]
