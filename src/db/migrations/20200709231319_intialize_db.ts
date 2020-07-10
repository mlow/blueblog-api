import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  // CREATE TABLE types (...);
  await knex.schema.createTable("types", (table) => {
    table.specificType("id", "smallserial").primary();
    table.text("type").unique();
  });

  await knex("types").insert(
    ["Author", "Post", "JournalEntry", "Edit", "Draft"].map((type) => ({
      type,
    }))
  );

  // CREATE TABLE uuids (...);
  await knex.schema.createTable("uuids", (table) => {
    table.uuid("uuid").primary().defaultTo(knex.raw("uuid_generate_v1mc()"));
    table
      .specificType("type_id", "smallint")
      .notNullable()
      .references("types.id")
      .onDelete("CASCADE");
  });

  // CREATE TABLE authors (...);
  await knex.schema.createTable("authors", (table) => {
    table.uuid("id").primary().references("uuids.uuid").onDelete("CASCADE");
    table.text("name").notNullable();
    table.text("username").notNullable().unique();
    table.text("password_hash").notNullable();
  });

  // CREATE TABLE content (...);
  await knex.schema.createTable("content", (table) => {
    table.uuid("id").primary().references("uuids.uuid").onDelete("CASCADE");
    table
      .uuid("author_id")
      .notNullable()
      .references("authors.id")
      .onDelete("CASCADE");
    table.text("title").notNullable();
    table.text("content").notNullable();
  });

  // CREATE TABLE blog_posts (...);
  await knex.schema.createTable("blog_posts", (table) => {
    table.uuid("id").primary().references("content.id").onDelete("CASCADE");
    table.boolean("is_published").notNullable();
    table
      .timestamp("publish_date")
      .notNullable()
      .defaultTo(knex.raw("DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP())"));
  });

  // CREATE TABLE journal_entires (...);
  await knex.schema.createTable("journal_entries", (table) => {
    table.uuid("id").primary().references("content.id").onDelete("CASCADE");
    table
      .timestamp("date")
      .notNullable()
      .defaultTo(knex.raw("DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP())"));
  });

  // CREATE TABLE edits (...);
  await knex.schema.createTable("edits", (table) => {
    table.uuid("id").primary().references("uuids.uuid").onDelete("CASCADE");
    table
      .uuid("content_id")
      .notNullable()
      .references("content.id")
      .onDelete("CASCADE");
    table
      .timestamp("date")
      .notNullable()
      .defaultTo(knex.raw("DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP())"));
    table.text("changes").notNullable();
  });

  // CREATE TABLE drafts (...);
  await knex.schema.createTable("drafts", (table) => {
    table.uuid("id").primary().references("uuids.uuid").onDelete("CASCADE");
    table.enum("type", ["Post", "JournalEntry"]);
    table
      .timestamp("date")
      .notNullable()
      .defaultTo(knex.raw("DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP())"));
    table.text("content").notNullable();
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable("drafts");
  await knex.schema.dropTable("edits");
  await knex.schema.dropTable("journal_entries");
  await knex.schema.dropTable("blog_posts");
  await knex.schema.dropTable("content");
  await knex.schema.dropTable("authors");
  await knex.schema.dropTable("uuids");
  await knex.schema.dropTable("types");
}
