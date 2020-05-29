# BlueBlog API
A GraphQL blogging API.

## Features
* Username/Password JWT based authentication
* Blog posts and client-side encrypted journal entries
* Obfuscated IDs via [hashids](https://www.npmjs.com/package/hashids)
* Drafts for both of the above
* Blog post edit history

## Environment Variables:

```
# The secret used for JWT signatures creation and verification
SECRET=my-super-secret

# So hashids are unique
HASHIDS_SALT=salty

# PostgreSQL connection params
DB_HOST=localhost
DB_NAME=blueblog
DB_USER=blueblog
DB_PASSWORD=password
DB_PORT=5432

# Application startup PostgresSQL connection attempts & retry delay
DB_CONNECT_ATTEMPTS=6
DB_CONNECT_RETRY_DELAY=5

# Service responds at http://localhost:$LISTEN_PORT/graphql
LISTEN_PORT=4000
```
