CREATE TABLE IF NOT EXISTS types (
    id smallserial PRIMARY KEY,
    type text UNIQUE
);

INSERT INTO
    types (type)
VALUES
    ('Author'),
    ('Post'),
    ('PostEdit'),
    ('Comment');

CREATE TABLE IF NOT EXISTS uuids (
    uuid uuid NOT NULL DEFAULT uuid_generate_v1mc(),
    type_id smallint NOT NULL REFERENCES types (id) ON DELETE CASCADE,
    PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS authors (
    id uuid NOT NULL REFERENCES uuids (uuid) ON DELETE CASCADE,
    name text NOT NULL,
    username text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS posts (
    id uuid NOT NULL REFERENCES uuids (uuid) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES authors (id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    is_published boolean NOT NULL,
    publish_date timestamp NOT NULL DEFAULT DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP()),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS post_edits (
    id uuid NOT NULL REFERENCES uuids (uuid) ON DELETE CASCADE,
    post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    date timestamp NOT NULL DEFAULT DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP()),
    changes text NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS comments (
    id uuid NOT NULL REFERENCES uuids (uuid) ON DELETE CASCADE,
    post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    date timestamp NOT NULL DEFAULT DATE_TRUNC('milliseconds', CLOCK_TIMESTAMP()),
    comment text NOT NULL,
    author text,
    author_email text,
    PRIMARY KEY (id)
);
