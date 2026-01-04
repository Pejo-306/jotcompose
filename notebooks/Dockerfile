FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json .
RUN npm ci --only=production

FROM gcr.io/distroless/nodejs22 AS runner

WORKDIR /app

COPY --from=build /app/node_modules node_modules
COPY healthcheck.js healthcheck.js
COPY src src

ENV PORT=3000

CMD ["src/app.js"]
