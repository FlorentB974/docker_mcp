FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Install dependencies and build
COPY package*.json ./
# install devDependencies so tsc is available for the build
# install devDependencies but skip lifecycle scripts (prepare/build) so we can copy sources first
RUN npm ci --include=dev --silent --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/build ./build

# Install production dependencies so runtime modules (like @modelcontextprotocol/sdk) are available
# Skip lifecycle scripts to avoid running 'prepare' which requires dev tools (tsc)
RUN npm ci --production --silent --ignore-scripts

ENV NODE_ENV=production

CMD ["node", "build/index.js"]
