const Stat = require('../models/statModel');
const statService = require('../services/statService');
require('dotenv').config();

exports.all = async (req, res) => {
    let stats;
    try {
        stats = await Stat.findByUser(req.user.id);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
    if (!stats.length) return res.status(204).end();
    res.status(200).json({ stats: stats });
};

exports.comparison = async (req, res) => {
    if (!req.body.firstTagId || !req.body.secondTagId) {
        return res.status(400).json({ message: 'Необходимо указать ID двух тегов для сравнения' });
    }
    try {
        const comparison = await statService.getComparisonByTags(req.body.firstTagId, req.body.secondTagId);
        res.status(200).json(comparison);
    } catch (err) {
        console.error(err);
        res.status(err.code === 'tag_not_found' ? 400 : 500)
            .json({ message: err.message });
    }
};