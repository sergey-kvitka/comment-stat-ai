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

exports.update = async (req, res) => {
    try {
        const userId = req.user.id;
        let tag = req.body.tag;
        tag.userId = userId;

        await Promise.all([
            Tag.update(tag),

            tag.deletedChildren.length
                ? Tag.deleteAll(tag.deletedChildren)
                : Promise.resolve(),

            ...tag.newChildren.map(child =>
                Tag.create({ ...child, userId: userId })
            )
        ]);
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await Tag.deleteAll(req.body.ids);
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};