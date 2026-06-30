FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY apps/api apps/api
RUN pnpm api:build
RUN cd apps/api && DATABASE_URL=postgresql://localhost:5432/dummy ./node_modules/.bin/prisma generate
RUN cd apps/api && npx tsup prisma/seed.ts --format cjs --outDir prisma-compiled

FROM node:22-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/prisma-compiled/seed.js ./prisma/seed.js
COPY --from=build /app/apps/api/prisma.config.ts ./prisma.config.ts

# Install runtime deps via npm (flat, no symlink issues)
COPY --from=build /app/apps/api/package.json ./package.json
RUN npm install --omit=dev
RUN npm install @prisma/config prisma dotenv
RUN DATABASE_URL=postgresql://localhost:5432/dummy ./node_modules/.bin/prisma generate

RUN mkdir -p uploads && chown appuser:appgroup uploads
EXPOSE 3333
USER appuser
COPY docker-entrypoint.sh /docker-entrypoint.sh
USER root
RUN chmod +x /docker-entrypoint.sh
USER appuser
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
