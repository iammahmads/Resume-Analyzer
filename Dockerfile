# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the application source code
COPY . .

# Build the frontend and backend server
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy over compiled build artifacts from builder stage (React dist + server.cjs)
COPY --from=builder /app/dist ./dist

# Specify environment configurations
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start compiled server
CMD ["npm", "start"]
