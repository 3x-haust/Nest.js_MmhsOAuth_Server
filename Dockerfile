FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package.json yarn.lock* ./
RUN yarn install --production --frozen-lockfile --silent && \
    yarn global add @nestjs/cli && \
    yarn add passport @nestjs/passport passport-jwt passport-local && \
    mv node_modules ../
COPY . .
EXPOSE 2096
RUN chown -R node /usr/src/app
USER node
CMD /bin/sh -c "npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts && yarn start"