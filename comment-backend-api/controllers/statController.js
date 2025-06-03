const Stat = require('../models/statModel');
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
