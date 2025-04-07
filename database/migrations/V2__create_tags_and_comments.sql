create table tags (
    id bigserial primary key,
    name varchar(30) not null,
    color varchar(30) not null,
    parent_id bigint,
    user_id integer not null,
    
    constraint fk_tags_parent foreign key (parent_id) references tags(id)
        on delete cascade,
    
    constraint fk_tags_user foreign key (user_id) references users(id)
        on delete cascade
);

create table sentiments (
    id serial primary key,
    name varchar(30) unique not null
);

create table emotions (
    id serial primary key,
    name varchar(30) unique not null
);

create table comments (
    id bigserial primary key,
    text varchar(2000) not null,
    user_id integer,
    tag_id bigint,
    sentiment_id integer,
    emotion_id integer,
    analyzed boolean not null default false,
    created_at timestamp not null default clock_timestamp(),
    modified_at timestamp not null default clock_timestamp(),

    constraint fk_comments_tag foreign key (tag_id) references tags(id)
        on delete set null,

    constraint fk_comments_user foreign key (user_id) references users(id)
        on delete set null,

    constraint fk_comments_sentiment foreign key (sentiment_id) references sentiments(id)
        on delete set null,

    constraint fk_comments_emotion foreign key (emotion_id) references emotions(id)
        on delete set null
);