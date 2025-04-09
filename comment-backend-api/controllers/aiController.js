require('dotenv').config();

const axios = require('axios');

exports.analyze = async (req, res) => {
    try {
        const response = await axios.post(
            `${process.env.AI_SERVICE_URL}/api/analyze`,
            { comments: req.body.comments },
            { headers: { 'Content-Type': 'application/json' } }
        );
        res.status(200).json(response.data);
    } catch (e) {
        console.error('Error making external request:', e);
        res.status(500).json({ error: 'External API request failed' });
    }
};