import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  await knex.schema.raw(`
    CREATE TYPE type AS ENUM (
      'Author',
      'Edit',
      'Draft',
      'BlogPost',
      'JournalEntry'
    );

    CREATE TABLE ids (
      id bigserial NOT NULL,
      type type NOT NULL,
      PRIMARY KEY (id)
    );
    ALTER SEQUENCE ids_id_seq RESTART WITH 1000000;

    CREATE TABLE author (
      id bigint NOT NULL REFERENCES ids (id) ON DELETE CASCADE,
      name text NOT NULL,
      username text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      key_salt text NOT NULL,
      wrapped_key text NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE content (
      id bigint NOT NULL REFERENCES ids (id) ON DELETE CASCADE,
      author_id bigint NOT NULL REFERENCES author (id) ON DELETE CASCADE,
      title text NOT NULL,
      content text NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE blog_post (
      id bigint NOT NULL REFERENCES content (id) ON DELETE CASCADE,
      publish_date timestamp NOT NULL DEFAULT DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP()),
      PRIMARY KEY (id)
    );

    CREATE TABLE journal_entry (
      id bigint NOT NULL REFERENCES content (id) ON DELETE CASCADE,
      date timestamp NOT NULL DEFAULT DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP()),
      PRIMARY KEY (id)
    );

    CREATE TABLE edit (
      id bigint NOT NULL REFERENCES ids (id) ON DELETE CASCADE,
      content_id bigserial NOT NULL REFERENCES content (id) ON DELETE CASCADE,
      date timestamp NOT NULL DEFAULT DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP()),
      changes text NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE draft (
      id bigint NOT NULL REFERENCES content (id) ON DELETE CASCADE,
      date timestamp NOT NULL DEFAULT DATE_TRUNC('millisconds', CLOCK_TIMESTAMP()),
      PRIMARY KEY (id)
    );
  `);
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable("draft");
  await knex.schema.dropTable("edit");
  await knex.schema.dropTable("journal_entry");
  await knex.schema.dropTable("blog_post");
  await knex.schema.dropTable("content");
  await knex.schema.dropTable("author");
  await knex.schema.dropTable("ids");
  await knex.schema.raw("DROP TYPE type;");
}
