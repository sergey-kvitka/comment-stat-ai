const Comment = require('../models/commentModel');
require('dotenv').config();

exports.all = async (req, res) => {
    let comments;
    try {
        comments = await Comment.findByUser(req.user.id);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
    if (!comments.length) return res.status(204);
    res.status(200).json({ comments: comments });
};

exports.save = async (req, res) => {
    try {
        req.body.comment.userId = req.user.id;
        const comment = await Comment.save({ ...req.body.comment, userId: req.user.id });
        res.status(200).json({ comment: comment });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

exports.getByFilters = async (req, res) => {
    let comments;
    try {
        comments = await Comment.findByFilters({ ...req.body, userId: req.user.id });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
    if (!comments.length) return res.status(204);
    res.status(200).json({ comments: comments });
};
