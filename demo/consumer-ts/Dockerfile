FROM node:20-slim

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json consumer.ts ./

CMD ["npx", "tsx", "consumer.ts"]
