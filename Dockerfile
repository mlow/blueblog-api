# dev stage
FROM node:14-alpine as dev
WORKDIR /app
RUN apk update && apk add --no-cache python3 make gcc g++
COPY *.json ./
RUN npm ci
COPY . .

# build stage
FROM dev as build
RUN npx tsc && npm ci --only=production

# production stage
FROM node:14-alpine
WORKDIR /app

RUN printf "%b" '#!'"/bin/sh\n\
set -e\n\
if [ ! -z \"\$RUN_MIGRATIONS\" ]; then\n\
    echo \"Running migrations.\"\n\
    npm run knex:migrate:latest\n\
fi\n\
exec \"\$@\"\n" > docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Copy over production modules and dist folder
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/db ./db

EXPOSE 4000

ENTRYPOINT [ "./docker-entrypoint.sh" ]
CMD [ "node", "dist/main.js" ]
