FROM node:lts-alpine AS builder
WORKDIR /usr/src/app
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile --silent
COPY . .
RUN yarn build

FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package.json yarn.lock* ./
RUN yarn install --production --frozen-lockfile --silent && yarn cache clean
COPY --from=builder /usr/src/app/dist ./dist
EXPOSE 3000
RUN mkdir -p uploads && chown -R node:node /usr/src/app
USER node
CMD ["yarn", "start:prod"]
