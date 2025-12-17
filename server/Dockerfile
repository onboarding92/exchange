FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript -> dist/
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
