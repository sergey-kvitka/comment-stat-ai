exports.processWithoutTags = async (comment, processFunc, saveTags = true) => {
    let processedComment = await processFunc({
        ...comment,
        tagIds: undefined,
    });
    if (saveTags) {
        if (!processedComment) processedComment = {};
        processedComment.tagIds = comment.tagIds;
    }
    return processedComment;
};