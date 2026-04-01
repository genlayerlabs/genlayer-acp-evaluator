FROM node:20-alpine AS build-service
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
RUN npx tsc -p tsconfig.json

FROM node:20-alpine AS build-dashboard
WORKDIR /dashboard
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci
COPY dashboard/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build-service /app/dist/ dist/
COPY --from=build-dashboard /dashboard/dist/ dashboard/dist/
COPY contracts/ contracts/

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "--enable-source-maps", "dist/src/server.js"]
