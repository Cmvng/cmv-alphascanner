# Single image: builds the SPA and runs the Node service that serves it, hosts the api/*
# handlers, and drives the in-process scheduler.
FROM node:22-slim

WORKDIR /app

# Frontend deps first — this layer changes least often.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Server deps.
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --no-audit --no-fund

# Source.
COPY . .

# Build the SPA. The server serves ./dist and imports ./api/*.ts directly via tsx.
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "--prefix", "server", "run", "start"]
