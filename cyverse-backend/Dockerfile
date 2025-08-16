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

# Create app directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the API code
COPY server.js /app/server.js

# Create data directory for mounting CyVerse Data Store
RUN mkdir -p /data

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Run the application
CMD ["node", "server.js"]