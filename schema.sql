CREATE TABLE types (
    id smallserial PRIMARY KEY,
    type text UNIQUE
);
INSERT INTO types (type)
VALUES ('Author'), ('Post'), ('PostEdit'), ('Comment');

CREATE TABLE uuids (
    uuid uuid NOT NULL DEFAULT uuid_generate_v4(),
    type_id smallint REFERENCES types (id) NOT NULL,
    PRIMARY KEY (uuid)
);

CREATE TABLE authors (
    id uuid REFERENCES uuids (uuid) NOT NULL,
    name text UNIQUE NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE posts (
    id uuid REFERENCES uuids (uuid) NOT NULL,
    author_id uuid REFERENCES authors (id) NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_published boolean NOT NULL,
    publish_date timestamp NOT NULL DEFAULT current_timestamp,
    PRIMARY KEY (id)
);

CREATE TABLE post_edits (
    id uuid REFERENCES uuids (uuid) NOT NULL,
    serial serial,
    post_id uuid REFERENCES posts (id) NOT NULL,
    edit_date timestamp NOT NULL DEFAULT current_timestamp,
    diff text NOT NULL,
    PRIMARY KEY (id)
);
CREATE INDEX post_edit_serial ON post_edits (serial);

CREATE TABLE comments (
    id uuid REFERENCES uuids (uuid) NOT NULL,
    post_id uuid REFERENCES posts (id) NOT NULL,
    date timestamp NOT NULL DEFAULT curent_timestamp,
    comment text NOT NULL,
    author text,
    author_email text,
    PRIMARY KEY (id)
);
