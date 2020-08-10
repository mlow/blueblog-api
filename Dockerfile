# build stage
FROM node:14-alpine as builder
WORKDIR /build
COPY *.json ./
RUN npm install
COPY src ./src
# build project with tsc
RUN npx tsc && npm ci --only=production

# production stage
FROM node:14-alpine
WORKDIR /blueblog
# Copy over production modules and dist folder
COPY --from=builder /build/package*.json ./
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist

EXPOSE 4000

RUN printf "%b" '#!'"/bin/sh\n\
set -e\n\
if [ ! -z \"\$RUN_MIGRATIONS\" ]; then\n\
    echo \"Running migrations.\"\n\
    npm run knex:migrate:latest\n\
fi\n\
exec \"\$@\"\n" > docker-entrypoint.sh && chmod +x docker-entrypoint.sh

ENTRYPOINT [ "./docker-entrypoint.sh" ]
CMD [ "node", "dist/main.js" ]
