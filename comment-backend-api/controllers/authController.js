const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
require('dotenv').config();

const cookieSettings = () => {
    return {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        domain: 'localhost',
        maxAge: +process.env.JWT_EXPIRES_IN * 1000,
        path: '/'
    };
};

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Проверка на существующего пользователя
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 12);

        // Создание пользователя
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
        });

        // Генерация токена
        const token = generateToken(newUser.id);

        res.cookie('token', token, cookieSettings());

        res.status(201).json({
            status: 'success',
            data: {
                user: newUser,
            },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Проверка на существующего пользователя
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Проверка пароля
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Генерация токена
        const token = generateToken(user.id);

        res.cookie('token', token, cookieSettings());

        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                },
            },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.check = async (_, res) => res.status(200).json({ status: 'success' });

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({
            status: 'success',
            data: {
                user,
            },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};