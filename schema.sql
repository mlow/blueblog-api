CREATE TABLE IF NOT EXISTS types (
    id smallserial PRIMARY KEY,
    type text UNIQUE
);
INSERT INTO types (type)
VALUES ('Author'), ('Post'), ('PostEdit'), ('Comment');

CREATE TABLE IF NOT EXISTS uuids (
    uuid uuid NOT NULL DEFAULT uuid_generate_v4(),
    type_id smallint REFERENCES types (id) NOT NULL,
    PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS authors (
    id uuid REFERENCES uuids (uuid) NOT NULL,
    name text NOT NULL,
    username text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS posts (
    id uuid REFERENCES uuids (uuid) NOT NULL,
    author_id uuid REFERENCES authors (id) NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_published boolean NOT NULL,
    publish_date timestamp NOT NULL DEFAULT current_timestamp,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS post_edits (
    id uuid REFERENCES uuids (uuid) NOT NULL,
    post_id uuid REFERENCES posts (id) NOT NULL,
    date timestamp NOT NULL DEFAULT current_timestamp,
    changes text NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS comments (
    id uuid REFERENCES uuids (uuid) NOT NULL,
    post_id uuid REFERENCES posts (id) NOT NULL,
    date timestamp NOT NULL DEFAULT current_timestamp,
    comment text NOT NULL,
    author text,
    author_email text,
    PRIMARY KEY (id)
);
