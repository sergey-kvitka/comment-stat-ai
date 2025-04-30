const db = require('../db');
const entityMapService = require('../services/entityMapService');

/** Maps <tag> object to required structure */
const mapInPlace = tag => {
    entityMapService.rename(tag, 'user_id', 'userId');
    entityMapService.rename(tag, 'parent_id', 'parentId');
}

const tagsToHierarchy = tags => {
    const tagMap = {};
    const roots = [];
    tags.forEach(tag => {
        tagMap[tag.id] = { ...tag, children: [] };
    });
    tags.forEach(tag => {
        const node = tagMap[tag.id];
        if (tag.parentId === null) {
            roots.push(node);
            return;
        }
        if (tagMap[tag.parentId]) {
            tagMap[tag.parentId].children.push(node);
        }
    });
    return roots;
};

class Tag {
    static async create({ name, color, parentId, userId }) {
        const result = await db.query(
            `insert into tags (name, color, parent_id, user_id) values ($1, $2, $3, $4)
            returning id, name, color, parent_id, user_id`,
            [name, color, parentId, userId]
        );
        mapInPlace(result.rows[0]);
        return result.rows[0];
    }

    static async update({ id, name, color }) {
        const result = await db.query(/* sql */ `
            update tags set
                name = coalesce($1, name),
                color = coalesce($2, color)
            where id = $3
            returning id, name, color, parent_id, user_id`,
            [name, color, id]
        );
        mapInPlace(result.rows[0]);
        return result.rows[0];
    }

    static async findById(id) {
        const result = await db.query(`select * from tags where id = $1`, [id]);
        mapInPlace(result.rows[0]);
        return result.rows[0];
    }

    static async findByIdList(ids) {
        const result = await db.query(/* sql */ `
            select * from tags where id in (
                select json_array_elements_text($1::json)::bigint
            )`,
            [JSON.stringify(ids)]
        );
        mapInPlace(result.rows[0]);
        return result.rows[0];
    }

    static async findByUser(userId) {
        const result = await db.query(`select * from tags where user_id = $1`, [userId]);
        const tags = result.rows;
        tags.forEach(tag => mapInPlace(tag));
        return tags;
    }

    static async findHierarchyByUser(userId) {
        const tags = await Tag.findByUser(userId);
        return tagsToHierarchy(tags);
    }

    static async findByComment(commentId) {
        const result = await db.query(`select * from tags where comment_id = $1`, [commentId]);
        const tags = result.rows;
        tags.forEach(tag => mapInPlace(tag));
        return tags;
    }

    static async deleteAll(tagIds) {
        await db.query(
            `delete from tags where id = ` + (Array.isArray(tagIds)
                ? /* sql */ `any($1::bigint[])`
                : /* sql */ `$1`
            ), tagIds
        );
    }
}

module.exports = Tag;