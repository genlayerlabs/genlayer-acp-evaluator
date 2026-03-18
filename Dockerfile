FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
RUN npx tsc -p tsconfig.json

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist/ dist/

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "--enable-source-maps", "dist/src/server.js"]
