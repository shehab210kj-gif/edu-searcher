# Use a base image with Node.js 22
FROM node:22-bullseye

# Install system dependencies required for Puppeteer and Chromium
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxss1 \
    libgtk-3-0 \
    libxshmfence1 \
    libglu1 \
    chromium \
    libreoffice \
    fonts-liberation \
    fonts-hosny-amiri \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm 9
RUN npm install -g pnpm@9.12.3

# Set the working directory
WORKDIR /app

# Copy the entire workspace, honoring .dockerignore
COPY . .

# Install workspace dependencies
RUN pnpm install --no-frozen-lockfile

# Build the api-server (and its local workspace dependencies)
RUN pnpm run build

# Start the application
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
