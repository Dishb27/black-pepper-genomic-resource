# Use Node.js 18 slim image
FROM node:18-slim

# Install system dependencies including BLAST+
RUN apt-get update && \
    apt-get install -y \
        curl \
        wget \
        ncbi-blast+ \
        dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Verify BLAST installation
RUN blastn -version

# Create non-root user for security
RUN groupadd -r blastuser && useradd -r -g blastuser blastuser

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies using npm install instead of npm ci
# Since we don't have a package-lock.json file
RUN npm install --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /data/blast_db /data/uploads /data/results && \
    chown -R blastuser:blastuser /app /data

# Expose port
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Switch to non-root user
USER blastuser

# Start the application
CMD ["node", "server.js"]