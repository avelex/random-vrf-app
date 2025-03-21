FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built application from build stage
COPY --from=build /app/build ./
COPY --from=build /app/package.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV ORIGIN=https://app.random-network.org
ENV HOST=0.0.0.0

# Expose the port
EXPOSE 5000

# Start the application
CMD ["node", "index.js"]
