const Comment = require('../models/commentModel');
require('dotenv').config();

exports.all = async (req, res) => {
    let comments;
    try {
        console.log(req.user.id);
        comments = await Comment.findByUser(req.user.id);
        console.table(comments);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
    if (!comments.length) return res.status(204);
    res.status(200).json({ comments: comments });
};