const fs = require('fs');

const Comment = require('../models/commentModel');
const Tag = require('../models/tagModel');

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
exports.fetchCommentData = async (commentIds, userId) => {
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
exports.commentComparator = (a, b) => {
    const createdDiff = new Date(a.createdStr) - new Date(b.createdStr);
    return createdDiff ? createdDiff : (+a.id - +b.id);
};

/**
 * Mapping function that excludes unnessessary properties from comments and maps tag ID array
 */
exports.commentMapper = (comment, tagMapper) => {
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

exports.getFileContent = files => {
    if (!files?.length) {
        const err = new Error("No attached files found");
        err.status = 400;
        throw err;
    }
    if (files.length > 1) {
        const err = new Error("Unable to handle more than 1 attached file");
        err.status = 400;
        throw err;
    }
    const file = files[0];
    let fileContent;
    try {
        fileContent = fs.readFileSync(file.path, 'utf-8');
    } catch (e) {
        console.warn(e);
        const err = new Error("Unable to read UTF-8 data from attached file");
        err.status = 400;
        throw err;
    } finally {
        if (file) fs.unlinkSync(file.path);
    }
    return fileContent;
};