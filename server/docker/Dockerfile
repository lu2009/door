FROM node:20-alpine AS builder
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma/ ./prisma/
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache curl tzdata
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh && chown appuser:appgroup /entrypoint.sh
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:5000/healthz || exit 1
ENTRYPOINT ["/entrypoint.sh"]
