const { stringify } = require('csv-stringify');
const { js2xml } = require('xml-js');

const Comment = require('../models/commentModel');
const Tag = require('../models/tagModel');

require('dotenv').config();

/**
 * Function that wraps asyncronous DB request in try-catch
 */
const defaultErrorHandler = async supplier => {
    try {
        const result = await supplier();
        return [result, null];
    } catch (err) {
        console.error(err);
        return [null, err];
    }
};

/**
 * Function that fetches comments and tags data and map it into readable structures
 */
const fetchCommentData = async (commentIds, userId) => {
    const [comments, commentError] = await defaultErrorHandler(() => Comment.findByIdList(commentIds));
    if (commentError) throw commentError;

    // todo: maybe admin would be allowed to do it
    if (comments.some(c => c.userId != userId)) {
        const userIdError = new Error("It is forbidden to edit other users' comments");
        userIdError.status = "userId";
        console.error(userIdError);
        throw userIdError;
    }

    let tagIds = comments.flatMap(comment => comment.tagIds || []);
    tagIds = Array.from(new Set(tagIds));

    const [tags, tagError] = await defaultErrorHandler(() => Tag.findByIdList(tagIds));
    if (tagError) throw tagError;

    const indexedTags = {};
    tags.forEach(tag => { indexedTags[tag.id] = tag; });

    return [comments, indexedTags];
};

/**
 * Comparing function to sort comments in default order
 */
const commentComparator = (a, b) => {
    const createdDiff = new Date(a.createdStr) - new Date(b.createdStr);
    return createdDiff ? createdDiff : (+a.id - +b.id);
};

/**
 * Mapping function that excludes unnessessary properties from comments and maps tag ID array
 */
const commentMapper = (comment, tagMapper) => {
    const {
        tagIds,
        userId,
        ...commentData
    } = comment;
    return {
        ...commentData,
        createdStr: comment.createdStr.toISOString(),
        modifiedStr: comment.modifiedStr.toISOString(),
        tags: tagMapper(comment.tagIds)
    };
};

exports.json = async (req, res) => { // ? endpoint to return comments and tags as JSON-file
    const commentIds = req.body.commentIds;
    const userId = req.user.id;

    let comments, indexedTags;
    try {
        [comments, indexedTags] = await fetchCommentData(commentIds, userId);
    } catch (err) {
        if (err.status === 'userId') {
            return res.status(403).json({ message: "It is forbidden to edit other users' comments" });
        }
        return res.status(500).json({ message: err.message });
    }

    const tagMapper = tagIds => (
        tagIds
            .map(id => indexedTags[id]?.path)
            .filter(Boolean)
            .toSorted()
    );
    const result = comments
        .toSorted(commentComparator)
        .map(comment => commentMapper(comment, tagMapper));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="comments.json"');
    res.send(JSON.stringify(result, null, 4));
};

exports.csv = async (req, res) => { // ? endpoint to return comments and tags as CSV-file
    const commentIds = req.body.commentIds;
    const userId = req.user.id;

    let comments, indexedTags;
    try {
        [comments, indexedTags] = await fetchCommentData(commentIds, userId);
    } catch (err) {
        if (err.status === 'userId') {
            return res.status(403).json({ message: "It is forbidden to edit other users' comments" });
        }
        return res.status(500).json({ message: err.message });
    }

    const tagMapper = tagIds => (
        tagIds
            .map(id => indexedTags[id]?.path)
            .filter(Boolean)
            .toSorted()
            .join(';')
    );
    const result = comments
        .toSorted(commentComparator)
        .map(comment => commentMapper(comment, tagMapper));

    stringify(
        result,
        {
            header: true,
            columns: Object.keys(result[0] || {}).map(key => ({ key: key, header: key }))
        },
        (err, output) => {
            if (err) {
                console.error('CSV generation error:', err);
                return res.status(500).json({ message: 'Failed to generate CSV' });
            }
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="comments.csv"');
            res.send(output);
        }
    );
};

exports.xml = async (req, res) => { // ? endpoint to return comments and tags as XML-file
    const commentIds = req.body.commentIds;
    const userId = req.user.id;

    let comments, indexedTags;
    try {
        [comments, indexedTags] = await fetchCommentData(commentIds, userId);
    } catch (err) {
        if (err.status === 'userId') {
            return res.status(403).json({ message: "It is forbidden to edit other users' comments" });
        }
        return res.status(500).json({ message: err.message });
    }

    const tagMapper = tagIds => ({
        tag: tagIds
            .map(id => indexedTags[id]?.path)
            .filter(Boolean)
            .toSorted()
            .map(path => ({ _text: path }))
    });
    const commentData = comments
        .toSorted(commentComparator)
        .map(comment => commentMapper(comment, tagMapper));

    try {
        const xml = js2xml(
            {
                comments: {
                    comment: commentData.map(comment => {
                        comment._attributes = { id: comment.id };
                        comment.text = { _cdata: comment.text };
                        delete comment.id;
                        return comment;
                    })
                }
            },
            {
                spaces: 4,
                compact: true,
                ignoreComment: true,
                attributesKey: '_attributes',
                textKey: '_text',
                cdataKey: '_cdata'
            }
        );
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', 'attachment; filename="comments.xml"');
        res.send(xml);
    } catch (err) {
        console.error('XML export error:', err);
        res.status(500).json({ message: 'Failed to generate XML export' });
    }
}