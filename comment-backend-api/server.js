const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const commentRoutes = require('./routes/commentRoutes');
const cookieParser = require('cookie-parser');

function createApp() {
    const app = express();

    // base middleware
    app.use(express.json());
    app.use(cookieParser());

    // CORS
    if (!process.env.WEB_UI_URL) throw new Error('WEB_UI_URL not configured in .env');
    app.use(cors({
        origin: process.env.WEB_UI_URL,
        credentials: true,
        exposedHeaders: ['Set-Cookie']
    }));

    // health check
    app.get('/', (_, res) => res.send('Node.js service is running'));

    return app;
}

function configureRoutes(app) {
    app.use('/api/auth', authRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/comment', commentRoutes);
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