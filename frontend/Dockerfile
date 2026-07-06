FROM node:22-alpine AS build-main
WORKDIR /build/main
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:22-alpine AS build-ai
WORKDIR /build/ai
COPY ai-test-frontend/package.json ai-test-frontend/package-lock.json* ./
RUN npm ci
COPY ai-test-frontend/ .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY frontend/serve.js .
COPY --from=build-main /build/main/dist ./dist
COPY --from=build-ai /build/ai/dist ./ai-test-dist
RUN ls -la /app/dist /app/ai-test-dist
EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --spider -q http://localhost:5173/ || exit 1
ENTRYPOINT ["node", "serve.js"]
