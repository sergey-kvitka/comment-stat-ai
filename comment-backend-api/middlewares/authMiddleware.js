const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.protect = (req, res, next) => {
    let token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
    try {
        // Верификация токена
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
