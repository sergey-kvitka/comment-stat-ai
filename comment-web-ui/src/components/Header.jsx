import axios from 'axios';

import { useState, useRef, useEffect } from 'react';
import { AccountCircle } from "@mui/icons-material";
import { Box, Button, CircularProgress, IconButton, Link, Popover, TextField, Typography } from "@mui/material";
import useNotificationApi from '../contexts/NotificationContext';

const Header = ({ currentPage, onLogout }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const iconButtonRef = useRef(null);
    const popoverRef = useRef(null);

    const [userLoaded, setUserLoaded] = useState(false);

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [apiKey, setApiKey] = useState('');

    const { defaultSuccessNotification, defaultErrorNotification } = useNotificationApi();

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axios.get(
                    `${process.env.REACT_APP_BACKEND_URL}/api/auth/profile`,
                    { withCredentials: true }
                );
                let userData = response.data?.data?.user;
                if (!userData) userData = {
                    username: '',
                    email: '',
                    apiKey: '',
                };
                setUsername(userData.username);
                setEmail(userData.email);
                setApiKey(userData.apiKey);
                setUserLoaded(true);
            } catch (err) {
                console.log(err);
                defaultErrorNotification(mapErrorAfterReq(err), 'Ошибка загрузки данных пользователя');
            }
        };
        fetchUserData();
    }, [defaultErrorNotification]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target) &&
                !iconButtonRef.current.contains(event.target)
            ) {
                handleClose();
            }
        };

        if (anchorEl) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [anchorEl]);

    const open = Boolean(anchorEl);

    return (
        <Box className="main-header" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div></div>

            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 4 }} className="head-link-cont">
                <Link
                    href="/home"
                    aria-label="to workspace"
                    sx={{
                        textDecoration: currentPage === 'home' ? 'underline !important' : 'none'
                    }}
                >Рабочее пространство</Link>
                <Link
                    href="/dashboard"
                    aria-label="to dashboard"
                    sx={{
                        textDecoration: currentPage === 'dashboard' ? 'underline !important' : 'none'
                    }}
                >Аналитическая панель</Link>
            </Box>

            <IconButton
                ref={iconButtonRef}
                onClick={handleClick}
                sx={{ padding: 0 }}
            >
                <AccountCircle sx={{ fontSize: 48, color: 'white' }} />
            </IconButton>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                sx={{
                    mt: 0.75,
                }}
                ref={popoverRef}
            >
                <Box
                    sx={{
                        px: 3,
                        pt: 1.5,
                        pb: 2.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                    }}
                >
                    <Typography variant="h5" sx={{ width: 'max-content' }}>Данные пользователя</Typography>
                    {(
                        !userLoaded && <CircularProgress size={24} sx={{ mt: 1.5 }} />
                    ) || <>
                            <TextField
                                label="Имя пользователя"
                                value={username}
                                readonly
                            />
                            <TextField
                                label="Адрес электронной почты"
                                value={email}
                                readonly
                            />
                            <TextField
                                label="Ключ API"
                                value={apiKey}
                                readonly
                            />
                            {/* eslint-disable-next-line */}
                            <a
                                className="copy-key-a"
                                onClick={() => {
                                    navigator.clipboard.writeText(apiKey);
                                    defaultSuccessNotification('API-ключ скопирован в буфер обмена!');
                                }}
                            >Скопировать ключ API</a>
                        </>}
                    <br />
                    <Button variant='contained' size='small' onClick={onLogout}>
                        Выйти из профиля
                    </Button>
                </Box>
            </Popover>
        </Box>
    );
};

function mapErrorAfterReq(err) {
    const response = err.response;
    const message = err.message;

    if (!(response || err.request)) {
        return {
            message: message || 'Неизвестная ошибка',
            type: 'setup_error'
        };
    }
    if (response) {
        return {
            message: response.data?.message || `Неизвестная ошибка сервиса! Статус: ${response.status}.`,
            status: response.status,
            data: response.data,
            type: 'server_error'
        };
    }
    if (err.code === 'ECONNREFUSED') {
        return {
            message: 'Ошибка соединения — сервис недоступен! Попробуйте позже или перезагрузите страницу.',
            code: err.code,
            isNetworkError: true,
            type: 'connection_refused'
        };
    } else if (message && message.includes('Network Error')) {
        return {
            message: 'Ошибка сети! Пожалуйста, проверьте интернет-соединение и перезагрузите страницу.',
            isNetworkError: true,
            type: 'network_error'
        };
    }
    return {
        message: message || 'Неизвестная ошибка запроса',
        code: err.code,
        isNetworkError: true,
        type: 'request_error'
    };
}

export default Header;
