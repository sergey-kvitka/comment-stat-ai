const { stringify } = require('csv-stringify');
const { js2xml } = require('xml-js');

const fileDataService = require('../services/fileDataService');

require('dotenv').config();


exports.json = async (req, res) => { // ? endpoint to return comments and tags as JSON-file
    const commentIds = req.body.commentIds;
    const userId = req.user.id;

    let comments, indexedTags;
    try {
        [comments, indexedTags] = await fileDataService.fetchCommentData(commentIds, userId);
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
        .toSorted(fileDataService.commentComparator)
        .map(comment => fileDataService.commentMapper(comment, tagMapper));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="comments.json"');
    res.send(JSON.stringify(result, null, 4));
};

exports.csv = async (req, res) => { // ? endpoint to return comments and tags as CSV-file
    const commentIds = req.body.commentIds;
    const userId = req.user.id;

    let comments, indexedTags;
    try {
        [comments, indexedTags] = await fileDataService.fetchCommentData(commentIds, userId);
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
        .toSorted(fileDataService.commentComparator)
        .map(comment => fileDataService.commentMapper(comment, tagMapper));

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
        [comments, indexedTags] = await fileDataService.fetchCommentData(commentIds, userId);
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
        .toSorted(fileDataService.commentComparator)
        .map(comment => fileDataService.commentMapper(comment, tagMapper));

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