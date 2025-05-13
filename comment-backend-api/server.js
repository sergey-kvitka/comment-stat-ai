const express = require('express');
require('dotenv').config();

const conditionalCors = require('./middlewares/cors');

const db = require('./db');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const commentRoutes = require('./routes/commentRoutes');
const exportRoutes = require('./routes/exportRoutes');
const importRoutes = require('./routes/importRoutes');
const tagRoutes = require('./routes/tagRoutes');

const cookieParser = require('cookie-parser');


function createApp() {
    const app = express();

    // base middleware
    app.use(express.json());
    app.use(cookieParser());

    // CORS
    if (!process.env.WEB_UI_URL) throw new Error('WEB_UI_URL not configured in .env');
    app.use(conditionalCors);

    // health check
    app.get('/', (_, res) => res.send('Node.js service is running'));

    return app;
}

function configureRoutes(app) {
    app.use('/api/auth', authRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/comment', commentRoutes);
    app.use('/api/comment/export', exportRoutes);
    app.use('/api/comment/import', importRoutes);
    app.use('/api/tag', tagRoutes);
}

function getConfiguredPort() {
    const port = process.env.PORT;
    if (!port) throw new Error('PORT not configured in .env');
    return port;
}

async function startServer() {
    try {
        const app = createApp();

        await db.initializeDB();
        configureRoutes(app);

        const PORT = getConfiguredPort();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
