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
