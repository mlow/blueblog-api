# build stage
FROM node:14-alpine as builder
WORKDIR /build
RUN apk update && apk add --no-cache python3 make gcc g++
COPY *.json ./
RUN npm ci
COPY src ./src
# build project with tsc
RUN npx tsc && npm prune --production

# production stage
FROM node:14-alpine
WORKDIR /blueblog
RUN printf "%b" '#!'"/bin/sh\n\
set -e\n\
if [ ! -z \"\$RUN_MIGRATIONS\" ]; then\n\
    echo \"Running migrations.\"\n\
    npm run knex:migrate:latest\n\
fi\n\
exec \"\$@\"\n" > docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Copy over production modules and dist folder
COPY --from=builder /build/package*.json ./
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist

EXPOSE 4000

ENTRYPOINT [ "./docker-entrypoint.sh" ]
CMD [ "node", "dist/main.js" ]
