# Use the official Node.js LTS Alpine image as base for lightweight footprint
FROM node:20-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Copy package descriptors first to take advantage of Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy remaining source code files
COPY . .

# Expose server port (default Express port)
EXPOSE 5000

# Start production server
CMD ["node", "app.js"]
