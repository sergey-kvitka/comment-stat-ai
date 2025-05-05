const Comment = require('../models/commentModel');
require('dotenv').config();

exports.all = async (req, res) => {
    let comments;
    try {
        comments = await Comment.findByUser(req.user.id);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
    if (!comments.length) return res.status(204).end();
    res.status(200).json({ comments: comments });
};

exports.save = async (req, res) => {
    try {
        const comment = await Comment.save({ ...req.body.comment, userId: req.user.id });
        res.status(200).json({ comment: comment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
}

exports.getByFilters = async (req, res) => {
    let comments;
    try {
        comments = await Comment.findByFilters({ ...req.body, userId: req.user.id });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
    if (!comments.length) {
        return res.status(204).end();
    }
    res.status(200).json({ comments: comments });
};

exports.updateAll = async (req, res) => {
    try {
        const commentIds = req.body.commentIds;
        let comments = await Comment.findByIdList(commentIds);
        if (!comments.length) return res.status(204).end();

        const userId = req.user.id;
        if (comments.some(c => c.userId != userId)) {
            // todo: maybe admin would be allowed to do it
            return res.status(403).json({ message: "It is forbidden to edit other users' comments" });
        }
        const updates = req.body;
        if (comments.length !== 1) updates.text = undefined;
        comments.forEach(comment => {
            ["text", "emotion", "sentiment"].forEach(column => {
                if (updates[column] !== undefined) comment[column] = updates[column];
            });
            const resultTags = new Set(comment.tagIds);
            if (updates.tagsToAdd?.length) {
                updates.tagsToAdd.forEach(tag => resultTags.add(String(tag)));
            }
            if (updates.tagsToDelete?.length) {
                updates.tagsToDelete.forEach(tag => resultTags.delete(String(tag)));
            }
            comment.tagIds = Array.from(resultTags);
            // comment.analyzed can't be updated here
        });
        comments = await Comment.saveAll(comments);
        res.status(200).json({ comments: comments });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await Comment.deleteAll(req.body.ids);
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};