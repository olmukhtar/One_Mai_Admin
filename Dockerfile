# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies using clean install
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps

# Copy application source code
COPY . .

# Build arguments for Vite env variables (injected at build time)
ARG VITE_API_URL
ARG VITE_IMAGE_BASE_URL

# Set environment variables for the Vite build context
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_IMAGE_BASE_URL=$VITE_IMAGE_BASE_URL

# Build the application
RUN npm run build

# Stage 2: Serve stage
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
