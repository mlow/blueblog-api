import dotenv from "dotenv";

// knex CLI doesn't seem to respect the --cwd option and will chdir to
// whever the knexfile is
dotenv.config({ path: "../../.env" });

module.exports = {
  client: "pg",
  connection: {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT!) || 5432,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: "knex_migrations",
  },
};
