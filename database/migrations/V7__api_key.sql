create or replace function generate_api_key()
returns text as $$
declare
    l_key text;
begin
    select string_agg(
        substr(
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
            floor(random() * 62 + 1)::integer,
            1
        ),
        ''
    )
    into l_key
    from generate_series(1, 48);
    return l_key;
end;
$$ language plpgsql;

create table user_config (
    id bigserial primary key,
    user_id integer,
    api_key text not null default generate_api_key(),

    constraint fk_config_user foreign key (user_id) references users(id)
        on delete cascade
);

create index idx_config_u_id on user_config(user_id);

insert into user_config (user_id, api_key)
select
    u.id as user_id,
    generate_api_key() as api_key
from users u
left join user_config c on u.id = c.user_id
where c.user_id is null;

create or replace function create_user_config()
returns trigger as $$
begin
    if not exists (select 1 from user_config where user_id = new.id) then
        insert into user_config (user_id) values (new.id);
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists tr_after_user_insert_key on users;
create trigger tr_after_user_insert_key
after insert on users
for each row execute function create_user_config();