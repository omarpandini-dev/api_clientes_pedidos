FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY migrations ./migrations
COPY scripts ./scripts
COPY src ./src
COPY test ./test
COPY dados ./dados

ENV NODE_ENV=production
EXPOSE 3000

USER node
CMD ["node", "src/server.js"]
