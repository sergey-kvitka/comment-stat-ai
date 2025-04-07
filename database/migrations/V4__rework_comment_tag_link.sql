drop index idx_comment_tag;

alter table comments drop column tag_id;

create table comment_tag_link (
    comment_id bigint not null,
    tag_id bigint not null,
    created_at timestamp not null default clock_timestamp(),

    primary key (comment_id, tag_id),

    constraint fk_comment_tag_link foreign key (comment_id) references comments(id)
        on delete cascade,

    constraint fk_tag_comment_link foreign key (tag_id) references tags(id)
        on delete cascade
);

create index idx_comment_tag_link on comment_tag_link(comment_id);

create index idx_tag_comment_link on comment_tag_link(tag_id);
