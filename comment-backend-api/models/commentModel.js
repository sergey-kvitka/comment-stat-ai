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
        id, text, user_id, analyzed, created_at, modified_at,
        (select name from sentiments s where s.id = sentiment_id) as "sentiment_id",
        (select name from emotions e   where e.id = emotion_id)   as "emotion_id"
    `;

const insertCommentSql = `insert into 
    comments (text, user_id, analyzed, sentiment_id, emotion_id)
    values (
        $1, $2, coalesce($3, false),
        (select id from sentiments where name = $4 and $4 is not null),
        (select id from emotions   where name = $5 and $5 is not null)
    ) ` + commentReturning;

const updateCommentSql = `update comments set
    text     = $1,
    user_id  = $2,
    analyzed = coalesce($3, false),
    modified_at  = clock_timestamp(),
    sentiment_id = case when $4 is null then null else (select id from sentiments where name = $4) end,
    emotion_id   = case when $5 is null then null else (select id from emotions   where name = $5) end
    where id = $6 ` + commentReturning;

class Comment {
    static async save({ id, text, userId, sentiment, emotion, analyzed, tagIds }) {
        let result;
        if (id === null) {
            result = await db.query(insertCommentSql, [text, userId, analyzed, sentiment, emotion]);
        } else {
            result = await db.query(updateCommentSql, [text, userId, analyzed, sentiment, emotion, id]);
        }
        const comment = result.rows[0];
        mapInPlace(comment);
        if (tagIds !== undefined) {
            comment.tagIds = tagIds;
            comment = await Comment.setTags(comment);
        }
        return comment;
    }

    static async setTags(comment) {
        const { tagIds } = comment;
        // removing tags that are not presented in parameter
        await db.query(/* sql */ `
            delete from comment_tag_link
            where comment_id = $1 
                and tag_id not in (
                    select json_array_elements_text($2::json)::bigint
                )
            `, [comment.id, JSON.stringify(tagIds)]
        );
        // saving tags to DB (with avoiding duplication)
        const updatedComment = Comment.addTags(comment, tagIds);
        return updatedComment;
    }

    static async addTags(comment, tagIds) {
        const id = comment.id;
        const result = await db.query( /* sql */ `
            insert into comment_tag_link (comment_id, tag_id)
            select
                $1 as comment_id,
                tags::bigint as tag_id
            from json_array_elements_text($2::json) as tags
            where tags::bigint not in (
                select tag_id from comment_tag_link where comment_id = $1
            )
            returning tag_id
            `, [id, JSON.stringify(tagIds)]
        );
        await db.query(`update comments set modified_at = clock_timestamp() where id = $1`, [id]);

        const prevTags = comment.tagIds ?? []; // previously presented tags in <comment> object
        const newTags = result.rows.map(row => row.tag_id); // tags successfuly added into DB
        const allTags = [...prevTags, ...newTags];
        return {
            ...comment,
            // joining, removing duplicates and sorting tags
            tagIds: Array.from(new Set(allTags)).sort((a, b) => +a - +b)
        };
    }

    static async deleteTags(comment, tagIds) {
        await db.query( /* sql */ `
            delete from comment_tag_link
            where comment_id = $1
                and tag_id in (
                    select json_array_elements_text($2::json)::bigint
                )`,
            [comment.id, JSON.stringify(tagIds)]
        );
    }

    static async saveAll(comments) {
        const savedComments = [];
        for (let comment of comments) {
            const saved = await Comment.save(comment);
            savedComments.push(saved);
        }
        return savedComments;
    }

    /**
     * Function executes query to DB and returns array of comments by tags (and their children)
     * @param {number[]} tagIds - integer array (tag IDs)
     * @returns Array of objects representing comments
     */
    static async findByTags(tagIds) {
        const result = await db.query(/* sql */ `
            with recursive all_tags as (
                select t.* from tags t where t.id = any(
                    array(select json_array_elements_text($1::json)::bigint)
                )
                union
                select t2.* from tags t2
                join all_tags tg on t2.parent_id = tg.id
            )
            select
                c.id, c.text, c.user_id, c.analyzed, c.created_at, c.modified_at,
                (select name from sentiments s where s.id = c.sentiment_id and c.sentiment_id is not null) as "sentiment",
                (select name from emotions   e where e.id = c.emotion_id   and c.emotion_id   is not null) as "emotion",
                (
                    select json_agg(ct.tag_id order by ct.tag_id) 
                    from comment_tag_link ct where ct.comment_id = c.id
                ) as tag_ids
            from comments c
            where exists (
                select 1 from comment_tag_link ct
                join all_tags tg on ct.tag_id = tg.id
                where ct.comment_id = c.id
            )`, [JSON.stringify(tagIds)]
        );
        const comments = result.rows;
        comments.forEach(tag => mapInPlace(tag));
        return comments;
    }

    static async findByUser(userId) {
        const result = await db.query(/* sql */ `
            select
                c.id, c.text, c.user_id, c.analyzed, c.created_at, c.modified_at,
                (select name from sentiments s where s.id = c.sentiment_id and c.sentiment_id is not null) as "sentiment",
                (select name from emotions   e where e.id = c.emotion_id   and c.emotion_id   is not null) as "emotion",
                (
                    select json_agg(ct.tag_id order by ct.tag_id) 
                    from comment_tag_link ct where ct.comment_id = c.id
                ) as tag_ids
            from comments c
            where c.user_id = $1
            order by c.modified_at desc
            `, [userId]
        );
        const comments = result.rows;
        comments.forEach(tag => mapInPlace(tag));
        return comments;
    }
}

module.exports = Comment;