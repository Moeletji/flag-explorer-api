FROM node:18-alpine AS base
WORKDIR /usr/src/app
RUN apk --no-cache add dumb-init

FROM base AS dependencies
COPY package.json 
RUN npm install --force --legacy-peer-deps --production=false 

FROM dependencies AS build
COPY . .
RUN npm build

FROM base AS production
ENV NODE_ENV=production
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./package.json

EXPOSE 3000

CMD ["dumb-init", "node", "dist/main.js"]
