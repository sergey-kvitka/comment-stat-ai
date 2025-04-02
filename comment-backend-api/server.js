const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const cookieParser = require('cookie-parser'); // Добавьте в начале файла

const app = express();

// middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    exposedHeaders: ['Set-Cookie'] // Добавьте эту строку
}));
app.use(express.json());
app.use(cookieParser());

// routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

// health check
app.get('/', (_, res) => {
    res.send('Node.js service is running');
});

const PORT = process.env.PORT;
if (PORT) {
    app.listen(PORT, () => {
        console.log(`Node.js service is running on port ${PORT}`);
    });
} else {
    console.error('Unable to get PORT from .env');
}
