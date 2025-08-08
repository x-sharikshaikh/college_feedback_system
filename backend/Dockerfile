# Backend Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build || echo "skip build on first init"
EXPOSE 4000
CMD ["npm", "run", "dev"]
