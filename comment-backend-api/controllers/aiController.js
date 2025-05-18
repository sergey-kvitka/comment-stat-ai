const commentService = require('../services/commentService');
const Comment = require('../models/commentModel');
const Stat = require('../models/statModel');
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

        Stat.save({ // saving stats asyncronously
            userId: req.user.id,
            action: 'comment-analysis-time',
            type: 'elapsed',
            value: response.data.elapsed_ms,
            amount: response.data.amount
        }).catch(
            err => console.error('Failed to save analysis stats: ', err)
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
                indexed[id] = await commentService.processWithoutTags(comment, async c => await Comment.save(c));
            } catch (err) {
                console.error(`Failed to save comment ${id}:`, err);
                throw err;
            }
        }));
        res.status(200).json(indexed);
    } catch (err) {
        console.error('Error making external request:', err);
        res.status(500).json({ message: 'External API request failed' });
    }
};