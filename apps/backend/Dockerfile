FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --workspace=apps/backend --include-workspace-root
COPY apps/backend apps/backend

WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["npx", "tsx", "src/app.ts"]
