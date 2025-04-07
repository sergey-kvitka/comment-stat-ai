do $$
declare
    l_emotions text[] := array['neutral', 'joy', 'sadness', 'surprise', 'fear', 'anger'];
    l_sentiments text[] := array['neutral', 'positive', 'negative'];
    l_value text;
    l_exists boolean;
begin
    delete from emotions e where not (e.name = any(l_emotions));
    foreach l_value in array l_emotions loop
        select exists (select 1 from emotions e where e.name = l_value) into l_exists;
        if not l_exists then
            insert into emotions (name) values (l_value);
        end if;
    end loop;

    delete from sentiments s where not (s.name = any(l_sentiments));
    foreach l_value in array l_sentiments loop
        select exists (select 1 from sentiments s where s.name = l_value) into l_exists;
        if not l_exists then
            insert into sentiments (name) values (l_value);
        end if;
    end loop;
end; $$;