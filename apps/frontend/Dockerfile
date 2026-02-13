FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_KEYCLOAK_URL=https://keycloak.test.example.com
ARG VITE_KEYCLOAK_REALM=cmp
ARG VITE_KEYCLOAK_CLIENT_ID=cmp-app

ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

COPY package*.json ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --workspace=apps/frontend --include-workspace-root

COPY apps/frontend apps/frontend
RUN npm run build --workspace=apps/frontend

FROM nginx:1.27-alpine AS runner
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
