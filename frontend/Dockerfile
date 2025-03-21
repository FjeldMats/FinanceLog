# Build stage
FROM node:14-alpine as build
WORKDIR /app

# Copy package files and install dependencies using BuildKit cache mount
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy the rest of the application code
COPY . .

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
