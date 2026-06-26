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
COPY --from=builder /usr/src/app/dist/src/template ./src/template
EXPOSE 3000
USER root
CMD ["yarn", "start:prod"]
