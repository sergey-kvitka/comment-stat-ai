import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    TextField,
    Typography,
    Link,
    Paper,
    Container,
    Alert
} from '@mui/material';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const AuthForm = ({ type }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        setEmail('');
        setPassword('');
        setUsername('');
        setError('');
    }, [type]);

    const isLogin = useMemo(() => {
        return type === 'login';
    }, [type]);

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');

        try {
            const emailText = email.trim();
            const usernameText = username.trim();

            if (!isLogin) {
                const errors = [];
                if (!emailRegex.test(emailText)) {
                    errors.push('• Неверый формат адреса электронной почты.');
                }
                if (usernameText.length < 4) {
                    errors.push('• Минимальная длина имени пользователя – 4 символа.');
                }
                if (password.length < 6) {
                    errors.push('• Минимальная длина пароля – 6 символов.');
                }
                if (errors.length) {
                    setError(errors.join('\n'));
                    return;
                }
            }

            const url = `${process.env.REACT_APP_BACKEND_URL}/api/auth/${isLogin ? 'login' : 'register'}`;
            const data = isLogin
                ? { email: email.trim(), password: password }
                : { email: email.trim(), password: password, username: username.trim() };
            const response = await axios.post(url, data, { withCredentials: true });

            if (response.status === 200 || response.status === 201) {
                navigate('/home');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Произошла ошибка! Попробуйте повторить вход или обновить страницу.');
        }
    };

    return <>
        <Typography variant="h4" className="auth-main-header main-grad">Comment Stat</Typography>
        <Container component="main" maxWidth="xs">
            <Paper elevation={3} sx={{ mt: 8, p: 4, pt:3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h4">
                    {isLogin ? 'Авторизация' : 'Регистрация'}
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                        {
                            error.split('\n').map((line, i) => (
                                <div key={i}>{line}</div>
                            ))
                        }
                    </Alert>
                )}

                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ mt: 1, width: '100%' }}
                    autoComplete={isLogin ? 'on' : 'off'}
                >
                    {!isLogin && (
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="register-username"
                            label="Имя пользователя"
                            name="register-username"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    )}

                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id={`${type}-email`}
                        label="Адрес электронной почты"
                        name={`${type}-email`}
                        autoComplete="email"
                        autoFocus={isLogin}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />

                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name={`${type}-password`}
                        label="Пароль"
                        type="password"
                        id={`${type}-password`}
                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />

                    <Button
                        type="submit"
                        color="success"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        {isLogin ? 'Авторизоваться' : 'Зарегистрироваться'}
                    </Button>

                    <Box textAlign="center">
                        <Typography variant="body2">
                            {isLogin ? (
                                <>Ещё нет аккаунта? <Link href="/register">Зарегистрируйтесь!</Link></>
                            ) : (
                                <>Уже есть аккаунт? <Link href="/login">Авторизуйтесь!</Link></>
                            )}
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Container>
    </>;
};

export default AuthForm;