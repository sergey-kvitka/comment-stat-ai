const db = require('../db');
const util = require('../services/util');

/** Maps <comment> object to required structure */
const mapInPlace = comment => {
    if (comment.tag_ids === null) comment.tag_ids = [];
    util.rename(comment, 'user_id', 'userId');
    util.rename(comment, 'tag_ids', 'tagIds');
    util.rename(comment, 'created_at', 'createdStr');
    util.rename(comment, 'modified_at', 'modifiedStr');
}

const commentSelect = /* sql */ `
    select
        c.id, c.text, c.user_id, c.analyzed, c.created_at, c.modified_at,
        (select name from sentiments s where s.id = c.sentiment_id and c.sentiment_id is not null) as "sentiment",
        (select name from emotions   e where e.id = c.emotion_id   and c.emotion_id   is not null) as "emotion",
        (
            select json_agg(ct.tag_id order by ct.tag_id)
            from comment_tag_link ct where ct.comment_id = c.id
        ) as tag_ids
    from comments c
    `;

const commentReturning = /* sql */ ` returning
        id, text, user_id, analyzed, created_at, modified_at,
        (select name from sentiments s where s.id = sentiment_id) as "sentiment",
        (select name from emotions e   where e.id = emotion_id)   as "emotion"
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
    sentiment_id = (select id from sentiments where name = $4 and $4 is not null),
    emotion_id   = (select id from emotions   where name = $5 and $5 is not null)
    where id = $6 ` + commentReturning;

class Comment {
    static async save({ id, text, userId, sentiment, emotion, analyzed, tagIds }) {
        let result;
        if (id === null) {
            result = await db.query(insertCommentSql, [text, userId, analyzed, sentiment, emotion]);
        } else {
            result = await db.query(updateCommentSql, [text, userId, analyzed, sentiment, emotion, id]);
        }
        let comment = result.rows[0];
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
        const result = await db.query(/* sql */ `
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
            ${commentSelect}
            where exists (
                select 1 from comment_tag_link ct
                join all_tags tg on ct.tag_id = tg.id
                where ct.comment_id = c.id
            )`, [JSON.stringify(tagIds)]
        );
        const comments = result.rows;
        comments.forEach(comment => mapInPlace(comment));
        return comments;
    }

    static async findByUser(userId) {
        const result = await db.query(/* sql */ `
            ${commentSelect}
            where c.user_id = $1
            order by c.modified_at desc
            `, [userId]
        );
        const comments = result.rows;
        comments.forEach(comment => mapInPlace(comment));
        return comments;
    }

    static async findByIdList(ids) {
        const result = await db.query(/* sql */ `
            with input_ids as (
                select value::bigint as id, ordinality as sort_order
                from json_array_elements_text($1::json) with ordinality
            )
            ${commentSelect}
            join input_ids i on c.id = i.id
            order by i.sort_order
            `, [JSON.stringify(ids.map(id => +id))]
        );
        const comments = result.rows;
        comments.forEach(comment => mapInPlace(comment));
        return comments;
    }

    static async findByFilters({
        userId, textSubstr, analyzed,
        created = {}, modified = {}, include = {}, exclude = {}
    }) {
        const { from: createdFrom, to: createdTo } = created;
        const { from: modifiedFrom, to: modifiedTo } = modified;
        const { tagIds: tagsIn = [], emotions: emotionsIn = [], sentiments: sentimentsIn = [] } = include;
        const { tagIds: tagsEx = [], emotions: emotionsEx = [], sentiments: sentimentsEx = [] } = exclude;

        let query = (
            /* sql */ `
            ${commentSelect}
            where 1 = 1`
        );

        const params = [];
        const paramNo = inc => '$' + (params.length + inc);

        if (userId) {
            query += /* sql */ ` and c.user_id = ${paramNo(1)}`;
            params.push(userId);
        }

        if (textSubstr) {
            query += /* sql */ ` and lower(c.text) like lower($${params.length + 1})`;
            params.push(`%${textSubstr}%`);
        }

        if (typeof analyzed === 'boolean') {
            query += /* sql */ ` and c.analyzed = ${paramNo(1)}`;
            params.push(analyzed);
        }

        if (createdFrom && createdTo) {
            query += /* sql */ ` and c.created_at between ${paramNo(1)} and ${paramNo(2)}`;
            params.push(createdFrom, createdTo);
        }

        if (modifiedFrom && modifiedTo) {
            query += /* sql */ ` and c.modified_at between ${paramNo(1)} and ${paramNo(2)}`;
            params.push(modifiedFrom, modifiedTo);
        }

        if (tagsIn.length) {
            query += /* sql */ `
                and exists (
                    select 1 from comment_tag_link ct
                    where ct.comment_id = c.id
                    and ct.tag_id in (
                        select id from tags where id = any(${paramNo(1)}::int[])
                        union
                        select id from tags where parent_id in (
                            select id from tags where id = any(${paramNo(1)}::int[])
                        )
                    )
                )`;
            params.push(tagsIn);
        }

        if (tagsEx.length) {
            query += /* sql */ `
                and not exists (
                    select 1 from comment_tag_link ct
                    where ct.comment_id = c.id
                    and ct.tag_id in (
                        select id from tags where id = any(${paramNo(1)}::int[])
                        union
                        select id from tags where parent_id in (
                            select id from tags where id = any(${paramNo(1)}::int[])
                        )
                    )
                )` + '\n';
            params.push(tagsEx);
        }

        const applyClassFilter = (array, name, incude = true) => {
            if (!array.length) return;
            query += /* sql */ ` and c.${name}_id ${incude ? 'in' : 'not in'} (select id from ${name}s where name = any(${paramNo(1)}::text[]))`;
            params.push(array);
        }
        applyClassFilter(emotionsIn, 'emotion');
        applyClassFilter(emotionsEx, 'emotion', false);
        applyClassFilter(sentimentsIn, 'sentiment');
        applyClassFilter(sentimentsEx, 'sentiment', false);

        query = query.replace(
            /* sql */ ` 1 = 1 and `,
            ' '
        );
        console.table(params.map((p, idx) => ({ '№': `$${idx + 1}`, 'value': p })));
        console.log(query);
        return []; // todo: test
        // const result = await db.query(query, params);
        // const comments = result.rows;
        // comments.forEach(comment => mapInPlace(comment));
        // return comments;
    }
}

module.exports = Comment;
