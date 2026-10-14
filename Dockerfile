# syntax=docker/dockerfile:1

# ---- Build: compile TypeScript with all dependencies ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts

COPY . .
# tsc + copy Pug templates to dist/views
RUN yarn build

# ---- Dependencies: production-only node_modules ----
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production --ignore-scripts \
  && yarn cache clean

# ---- Runtime ----
FROM node:20-alpine AS final
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5000

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1

# Migrations run automatically on boot (see src/index.ts)
CMD ["node", "dist/src/index.js"]
