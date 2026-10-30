FROM node:20-bookworm-slim AS runtime

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=4173
ENV DATABASE_PATH=/app/data/samarth.db

EXPOSE 4173
CMD ["node", "server.js"]
