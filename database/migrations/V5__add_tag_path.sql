-- ? to redo
/*
drop index idx_tags_path;
drop index idx_tags_parent_id;
drop trigger if exists tr_tags_path_update on tags;
drop trigger if exists tr_tags_path_child_update on tags;
alter table tags drop column path;
*/

-- * new column for tag
alter table tags add column path text;

-- * updating existing tags
with recursive tag_paths as (
    select -- base case: root tags (parent_id is null)
        id,
        user_id,
        name,
        parent_id,
        user_id || ':' || name as path
    from tags
    where parent_id is null

    union all

    select -- recursive case: child tags
        t.id,
        t.user_id,
        t.name,
        t.parent_id,
        tp.path || '/' || t.name as path
    from tags t
    join tag_paths tp on t.parent_id = tp.id
)
update tags t
set path = tp.path
from tag_paths tp
where t.id = tp.id;

-- * making new column required (not null)
alter table tags alter column path set not null;

-- * indexing new column
create index idx_tags_path on tags(path);
create index idx_tags_parent_id on tags(parent_id) where parent_id is not null;


create or replace function update_tag_path()
returns trigger as $$
declare
    parent_path text;
begin
    if tg_op = 'INSERT' or 
        (tg_op = 'UPDATE' and (
           new.parent_id is distinct from old.parent_id or 
           new.name is distinct from old.name
       )) then

        if new.parent_id is null then
            new.path := new.user_id || ':' || new.name;
        else
            select path into parent_path from tags where id = new.parent_id;

            if parent_path is not null then
                new.path := parent_path || '/' || new.name;
            else
                new.path := new.user_id || ':' || new.name;
            end if;
        end if;
    end if;
    
    return new;
end;
$$ language plpgsql;


drop trigger if exists tr_tags_path_update on tags;
create trigger tr_tags_path_update
before insert or update of parent_id, name on tags
for each row execute function update_tag_path();


create or replace function update_child_tags_path()
returns trigger as $$
begin
    -- always updating children on name, path and parent_id change
    with recursive child_tags as (
        -- starting from direct children
        select id, name, parent_id, path
        from tags
        where parent_id = new.id
        
        union all
        
        -- getting all children recursively
        select t.id, t.name, t.parent_id, t.path
        from tags t
        join child_tags ct on t.parent_id = ct.id
    )
    update tags t
    set path = (
        -- new path based on parent's path
        select p.path || '/' || t.name
        from tags p
        where p.id = t.parent_id
    )
    from child_tags ct
    where t.id = ct.id;
    
    return null;
end;
$$ language plpgsql;

drop trigger if exists tr_tags_path_child_update on tags;
create trigger tr_tags_path_child_update
after update of path, parent_id, name on tags
for each row execute function update_child_tags_path();