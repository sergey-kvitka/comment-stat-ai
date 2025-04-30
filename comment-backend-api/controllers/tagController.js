const Tag = require('../models/tagModel');
require('dotenv').config();

exports.all = async (req, res) => {
    let tags;
    try {
        tags = await Tag.findByUser(req.user.id);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
    if (!tags.length) return res.status(204).end();
    res.status(200).json({ tags: tags });
};

exports.save = async (req, res) => {
    try {
        const tag = await Tag.create({ ...req.body.tag, userId: req.user.id });
        res.status(200).json({ tag: tag });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};