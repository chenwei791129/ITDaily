FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun test && bun run build

# Bun server: serves dist/ and posts the Slack card on start. TLS is terminated upstream.
FROM oven/bun:1-alpine
WORKDIR /app
# NODE_ENV=production also turns off Bun.serve's detailed error pages.
ENV NODE_ENV=production TZ=Asia/Taipei PORT=8080
RUN apk add --no-cache tzdata
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY src ./src
COPY --from=build /app/dist ./dist
USER 1000:1000
EXPOSE 8080
CMD ["bun", "src/server.ts"]
