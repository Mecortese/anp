FROM node:20-alpine

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci --only=production

COPY src ./src
RUN npx tsc

COPY frontend-dist ./frontend-dist
COPY data ./data

EXPOSE 3000

CMD ["node", "dist/index.js"]
