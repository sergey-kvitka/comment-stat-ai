const cors = require('cors');
require('dotenv').config();

const strictCors = cors({
    origin: process.env.WEB_UI_URL,
    credentials: true,
    exposedHeaders: ['Set-Cookie']
});

const openCors = cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

module.exports = (req, res, next) => {
    return (
        req.headers['x-api-key']
            ? openCors
            : strictCors
    )(req, res, next);
};