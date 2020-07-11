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

    CREATE TABLE uuid (
      uuid uuid NOT NULL DEFAULT uuid_generate_v1mc(),
      type type NOT NULL,
      PRIMARY KEY (uuid)
    );

    CREATE TABLE author (
      id uuid NOT NULL REFERENCES uuid (uuid) ON DELETE CASCADE,
      name text NOT NULL,
      username text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE content (
      id uuid NOT NULL references uuid (uuid) ON DELETE CASCADE,
      author_id uuid NOT NULL REFERENCES author (id) ON DELETE CASCADE,
      title text NOT NULL,
      content text NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE blog_post (
      id uuid NOT NULL REFERENCES content (id) ON DELETE CASCADE,
      is_published boolean NOT NULL,
      publish_date timestamp NOT NULL DEFAULT DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP()),
      PRIMARY KEY (content_id)
    );

    CREATE TABLE journal_entry (
      id uuid NOT NULL REFERENCES content (id) ON DELETE CASCADE,
      date timestamp NOT NULL DEFAULT DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP()),
      PRIMARY KEY (content_id)
    );

    CREATE TABLE edit (
      id uuid NOT NULL REFERENCES uuid (uuid) ON DELETE CASCADE,
      content_id uuid NOT NULL REFERENCES content (id) ON DELETE CASCADE,
      date timestamp NOT NULL DEFAULT DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP()),
      changes text NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE draft (
      content_id uuid NOT NULL REFERENCES content (id) ON DELETE CASCADE,
      type type NOT NULL,
      date timestamp NOT NULL DEFAULT DATE_TRUNC('millisconds', CLOCK_TIMESTAMP()),
      PRIMARY KEY (content_id)
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
  await knex.schema.dropTable("uuid");
  await knex.schema.raw("DROP TYPE type;");
}
