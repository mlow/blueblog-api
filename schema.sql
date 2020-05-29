CREATE TABLE authors (
    id serial NOT NULL,
    name text UNIQUE,
    PRIMARY KEY (id)
);

CREATE TABLE posts (
    id serial,
    author_id integer REFERENCES authors (id) NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_published boolean NOT NULL,
    publish_time timestamp NOT NULL DEFAULT current_timestamp,
    PRIMARY KEY (id)
);

CREATE TABLE post_edits (
    id serial NOT NULL,
    post_id integer REFERENCES posts (id) NOT NULL,
    edit_time timestamp NOT NULL DEFAULT current_timestamp,
    diff text NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE comments (
    id serial NOT NULL,
    post_id integer REFERENCES posts (id) NOT NULL,
    comment text NOT NULL,
    author text,
    author_email text,
    PRIMARY KEY (id)
);
