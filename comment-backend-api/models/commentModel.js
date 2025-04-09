const db = require('../db');
const util = require('../services/util');

/** Maps <comment> object to required structure */
const mapInPlace = comment => {
    util.rename(comment, 'user_id', 'userId');
    util.rename(comment, 'tag_ids', 'tagIds');
    util.rename(comment, 'created_at', 'createdStr');
    util.rename(comment, 'modified_at', 'modifiedStr');
}

const commentReturning = /* sql */ ` returning
        id, text, user_id, tag_id, analyzed,
        case when sentiment_id is null then null else (select name from sentiments s where s.id = sentiment_id) end as "sentiment_id",
        case when emotion_id   is null then null else (select name from emotions   e where e.id = emotion_id  ) end as "emotion_id"
    `;

const insertCommentSql = `insert into 
    comments (text, user_id, tag_id, analyzed, sentiment_id, emotion_id)
    values (
        $1, $2, $3, coalesce($4, false),
        case when $5 is null then null else (select id from sentiments where name = $5) end,
        case when $6 is null then null else (select id from emotions   where name = $6) end
    ) ` + commentReturning;

const updateCommentSql = `update comments set 
    text     = $1,
    user_id  = $2, 
    tag_id   = $3, 
    analyzed = coalesce($4, false),
    modified_at  = clock_timestamp(),
    sentiment_id = case when $5 is null then null else (select id from sentiments where name = $5) end,
    emotion_id   = case when $6 is null then null else (select id from emotions   where name = $6) end
    where id = $7 ` + commentReturning;

class Comment {
    static async save({ id, text, userId, tagId, sentiment, emotion, analyzed }) {
        let result;
        if (id === null) {
            result = await db.query(insertCommentSql, [text, userId, tagId, analyzed, sentiment, emotion]);
        } else {
            result = await db.query(updateCommentSql, [text, userId, tagId, analyzed, sentiment, emotion, id]);
        }
        mapInPlace(result.rows[0]);
        return result.rows[0];
    }

    static async saveAll(comments) {
        // todo
    }

    /**
     * Function executes query to DB and returns array of comments by tags (and their children)
     * @param {number[]} tagIds - integer array (tag IDs)
     * @returns Array of objects representing comments
     */
    static async findByTags(tagIds) {
        const result = await db.query(/* sql */ `
            with recursive tag_hierarchy as (
                select t.* from tags t where t.id = any(array(
                        select json_array_elements_text($1::json)::bigint
                ))
                union
                select t.* from tags t
                join tag_hierarchy th on t.parent_id = th.id
            )
            select
                c.id, c.text, c.user_id, c.analyzed, c.created_at, c.modified_at,
                case when c.sentiment_id is null then null else (select name from sentiments s where s.id = c.sentiment_id) end as "sentiment",
                case when c.emotion_id   is null then null else (select name from emotions   e where e.id = c.emotion_id  ) end as "emotion",
                (
                    select json_agg(ct.tag_id order by ct.tag_id) 
                    from comment_tag_link ct where ct.comment_id = c.id
                ) as tag_ids
            from comments c
            where exists (
                select 1 
                from comment_tag_link ct
                join tag_hierarchy th on ct.tag_id = th.id
                where ct.comment_id = c.id
            )`, [JSON.stringify(tagIds)]
        );
        const comments = result.rows;
        comments.forEach(tag => mapInPlace(tag));
        return comments;
    }
}

module.exports = Comment;