# Use official Node.js slim image
FROM node:18-slim

# Install system dependencies including BLAST+
RUN apt-get update && \
    apt-get install -y \
        curl \
        wget \
        ncbi-blast+ \
    && rm -rf /var/lib/apt/lists/*

# Verify BLAST+ installation
RUN blastn -version

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first for caching
COPY package.json package-lock.json* ./

# Install Node.js dependencies
RUN npm install --production

# Copy application code
COPY server.js /app/server.js

# Create directory for mounting CyVerse data
RUN mkdir -p /data

# Expose the app port
EXPOSE 8080

# Optional: health check for container
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Run the application
CMD ["node", "server.js"]
