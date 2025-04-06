create table public.users (
    id serial primary key,
    username varchar(50) not null,
    email varchar(100) unique not null,
    password varchar(100) not null,
    created_at timestamp default current_timestamp
);