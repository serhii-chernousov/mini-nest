FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY tsconfig.json vitest.config.mts ./
COPY src/ ./src
COPY test/ ./test

RUN npm test && npm run build

CMD ["node", "dist/main.js"]
