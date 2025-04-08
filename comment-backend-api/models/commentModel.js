const db = require('../db');

/** Maps <comment> object to required structure */
const mapInPlace = comment => {
    util.rename(comment, 'user_id', 'userId');
    util.rename(comment, 'tag_id', 'tagId');
}

const commentReturning = /* sql */ ` returning
        id, text, user_id, tag_id, analyzed,
        case when sentiment_id is null then null else (select name from sentiments s where s.id = sentiment_id) end as "sentiment_id",
        case when sentiment_id is null then null else (select name from emotions   e where e.id = emotion_id  ) end as "emotion_id"
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

    static async findByTag(tagId) {
        const result = await db.query(/* sql */ `
            with recursive all_tags as (
                select t.* from tags t where t.id = $1
                union all
                select t2.* from tags t2
                join all_tags d on t2.parent_id = d.id
            )
            select c.* from comments c 
            join all_tags t on t.id = c.tag_id`, [tagId]
        );
        const tags = result.rows;
        tags.forEach(tag => mapInPlace(tag));
        return tags;
    }
}

module.exports = Comment;