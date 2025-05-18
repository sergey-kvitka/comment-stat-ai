const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
require('dotenv').config();

exports.protect = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ message: 'Ошибка авторизации: не передан токен доступа.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.id) throw new Error();
        req.user = { id: decoded.id };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Сессия завершена! Пожалуйста, пройдите авторизацию заново.' });
    }
};

exports.protectAPI = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ message: 'Not authorized: no API key provider' });
    }
    const user = await User.findByKeyAPI(apiKey);
    if (!user) {
        return res.status(401).json({ message: 'Not authorized: unable to validate provided API key' });
    }
    req.user = { id: user.id };
    next();
};

exports.forbidAPI = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        return res.status(403).json({ message: 'This request must not contain "X-API-key" header' });
    }
    next();
};