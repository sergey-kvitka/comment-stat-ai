create table stats (
    id bigserial primary key,
    user_id integer not null,
    action varchar(30) not null,
    type varchar(30) not null,
    value varchar(30),
    amount integer not null default 1,
    saved_at timestamp not null default current_timestamp,

    constraint fk_stats_user foreign key (user_id) references users(id)
        on delete cascade
);

create index idx_stats_user_id  on stats(user_id);
create index idx_stats_action   on stats(action);
create index idx_stats_type     on stats(type);
create index idx_stats_value    on stats(value);
create index idx_stats_saved_at on stats(saved_at);

create index idx_comments_id    on comments(id);

create index idx_tags_id        on tags(id);
create index idx_tags_user_id   on tags(user_id);

alter table comments add column last_modify_manual boolean not null default false;

create or replace function metric_comment_analyzed()
returns trigger as $$
declare
    stat_value  text;
    stat_action text;
begin
    if new.last_modify_manual then
        stat_action := 'manual';
    else
        stat_action := 'ai';
    end if;
    if new.emotion_id is not null then
        select name into stat_value from emotions where id = new.emotion_id;
        insert into stats (user_id, action, type, value) values (
            new.user_id,
            'comment-analysis-' || stat_action,
            'emotion',
            stat_value
        );
    end if;
    if new.sentiment_id is not null then
        select name into stat_value from sentiments where id = new.sentiment_id;
        insert into stats (user_id, action, type, value) values (
            new.user_id,
            'comment-analysis-' || stat_action,
            'sentiment',
            stat_value
        );
    end if;
    return new;
end;
$$ language plpgsql;


drop trigger if exists tr_metric_comment_analyzed on comments;
create trigger tr_metric_comment_analyzed
after update of emotion_id, sentiment_id on comments
for each row execute function metric_comment_analyzed();