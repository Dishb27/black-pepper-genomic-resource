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

# Verify BLAST+ installation
RUN blastn -version

# Create non-root user
RUN groupadd -r blastuser && useradd -r -g blastuser blastuser

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY server.js ./

# Create directories and set permissions
RUN mkdir -p /data /tmp/uploads && \
    chown -R blastuser:blastuser /app /data /tmp/uploads

# Switch to non-root user
USER blastuser

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]