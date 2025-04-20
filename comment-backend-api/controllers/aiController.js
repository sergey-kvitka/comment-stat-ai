const Comment = require('../models/commentModel');
require('dotenv').config();

const axios = require('axios');

exports.analyze = async (req, res) => {
    try {
        const indexed = {};
        const commentsToAnalyze = [];

        const comments = await Comment.findByIdList(req.body.ids); // with tags!
        comments.forEach(c => {
            // array to map with id as a key
            indexed[c.id] = c;
            // comments with id & text only
            commentsToAnalyze.push({ id: c.id, text: c.text });
        });

        const response = await axios.post(
            `${process.env.AI_SERVICE_URL}/api/analyze`,
            { comments: commentsToAnalyze },
            { headers: { 'Content-Type': 'application/json' } }
        );

        analyzedComments = response.data.comments;
        await Promise.all(Object.keys(analyzedComments).map(async id => {
            const newData = analyzedComments[id];
            const comment = {
                ...indexed[id],
                emotion: newData.emotion,
                sentiment: newData.sentiment,
                analyzed: true
            };
            try {
                const tags = comment.tagIds;
                comment.tagIds = undefined;
                indexed[id] = await Comment.save(comment);
                indexed[id].tagIds = tags;
            } catch (error) {
                console.error(`Failed to save comment ${id}:`, error);
                throw error;
            }
        }));

        res.status(200).json(indexed);
    } catch (e) {
        console.error('Error making external request:', e);
        res.status(500).json({ error: 'External API request failed' });
    }
};