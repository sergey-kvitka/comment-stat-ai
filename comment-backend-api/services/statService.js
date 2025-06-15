const Tag = require('../models/tagModel');
const Comment = require('../models/commentModel');

/**
 * Creates object with info about comments by tags
 * @param {string} leftTagId - tag ID for left selection
 * @param {string} rightTagId - tag ID for right selection
 * @returns object with info about comments by tags
 */
exports.getComparisonByTags = async (leftTagId, rightTagId) => {
    let tags = await Tag.findByIdList([leftTagId, rightTagId]);
    if (!tags) tags = [];
    const leftTag = tags.find(t => t.id === leftTagId);
    const rightTag = tags.find(t => t.id === rightTagId);

    if (tags.length < 2 || !leftTag || !rightTag) {
        const error = new Error('Не удалось найти теги по всем указанными ID: ' + JSON.stringify([leftTagId, rightTagId]));
        error.code = 'tag_not_found';
        throw error;
    }

    const comments = await Comment.findByTags([leftTagId, rightTagId]);
    const leftComments = comments.filter(c => c.tagIds.includes(leftTagId));
    const rightComments = comments.filter(c => c.tagIds.includes(rightTagId));

    const result = {
        general: {
            totalAmount: comments.length,
            commonAmount: leftComments.length + rightComments.length - comments.length
        }
    };

    [
        { tag: leftTag, comments: leftComments, key: "first" },
        { tag: rightTag, comments: rightComments, key: "second" },
    ].forEach(info => {
        const stat = {
            tag: info.tag,
            amount: info.comments.length,
            analyzed: 0,
            averageLength: 0,
            emotions: {
                joy: 0,
                anger: 0,
                sadness: 0,
                fear: 0,
                surprise: 0,
                neutral: 0
            },
            sentiments: {
                positive: 0,
                negative: 0,
                neutral: 0
            }
        };
        info.comments.forEach(comment => {
            if (comment.analyzed) {
                stat.analyzed += 1;
            }
            if (comment.emotion) {
                stat.emotions[comment.emotion] += 1;
            }
            if (comment.sentiment) {
                stat.sentiments[comment.sentiment] += 1;
            }
            stat.averageLength += comment.text.length;
        });
        stat.averageLength = (stat.averageLength / stat.amount).toFixed(3);
        result[info.key] = stat;
    });
    return result;
};