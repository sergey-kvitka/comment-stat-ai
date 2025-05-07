const Comment = require('../models/commentModel');
const Tag = require('../models/tagModel');
require('dotenv').config();

const defaultErrorHandler = async supplier => {
    try {
        const result = await supplier();
        return [result, null];
    } catch (err) {
        console.error(err);
        return [null, err];
    }
};

const errTo500 = err => res.status(500).json({ error: err.message });

exports.json = async (req, res) => {
    const commentIds = req.body.commentIds;

    const [comments, err1] = await defaultErrorHandler(() => Comment.findByIdList(commentIds));
    if (err1) return errTo500(err1);

    const userId = req.user.id;
    if (comments.some(c => c.userId != userId)) {
        // todo: maybe admin would be allowed to do it
        return res.status(403).json({ message: "It is forbidden to edit other users' comments" });
    }

    let tagIds = [];
    comments.forEach(comment => { tagIds = [...tagIds, ...comment.tagIds]; });
    tagIds = Array.from(new Set(tagIds));

    const [tags, err2] = await defaultErrorHandler(() => Tag.findByIdList(tagIds));
    if (err2) return errTo500(err2);

    const indexedTags = {};
    tags.forEach(tag => { indexedTags[tag.id] = tag; });

    const result = comments
        .toSorted((a, b) => {
            const createdDiff = new Date(a.createdStr) - new Date(b.createdStr);
            return createdDiff ? createdDiff : (+a.id - +b.id);
        })
        .map(comment => {
            const {
                // these two properties will not be returned
                tagIds,
                userId,
                analyzed, // todo exact meaning of this column
                ...commentData
            } = comment;
            return {
                ...commentData,
                tags: comment.tagIds.map(id => indexedTags[id]?.path).filter(Boolean).toSorted()
            };
        });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="comments.json"');
    res.send(JSON.stringify(result, null, 4));
};
