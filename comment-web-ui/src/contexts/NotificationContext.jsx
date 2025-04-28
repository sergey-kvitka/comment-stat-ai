import { useContext } from 'react';
import { createContext, useState, useCallback, useMemo, memo } from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';

// Создаем раздельные контексты для API и состояния
const NotificationApiContext = createContext();
const NotificationStateContext = createContext();

export const NotificationProvider = memo(({ children }) => {
    const [notifications, setNotifications] = useState([]);

    // Мемоизированная функция показа уведомлений
    const showNotification = useCallback((message, title, options = {}) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, title, ...options }]);
        return id;
    }, []);

    // Мемоизированная функция закрытия уведомлений
    const closeNotification = useCallback(id => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Мемоизированное API уведомлений
    const api = useMemo(() => ({
        notification: showNotification,
        show: showNotification,
        close: closeNotification
    }), [showNotification, closeNotification]);

    return (
        <NotificationApiContext.Provider value={api}>
            <NotificationStateContext.Provider value={notifications}>
                {children}
                {notifications.map(({ id, message, title, severity = 'info', ...props }) => (
                    <Snackbar
                        key={id}
                        open={true}
                        autoHideDuration={4000}
                        onClose={() => closeNotification(id)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        sx={{
                            transform: 'scale(1.25)',
                            transformOrigin: 'bottom right'
                        }}
                        {...props}
                    >
                        <Alert
                            severity={severity}
                            onClose={() => closeNotification(id)}
                            sx={{ minWidth: '300px' }}
                        >
                            {title && <AlertTitle>{title}</AlertTitle>}
                            {message}
                        </Alert>
                    </Snackbar>
                ))}
            </NotificationStateContext.Provider>
        </NotificationApiContext.Provider>
    );
});

// Хук для доступа к API уведомлений (не вызывает перерендеров)
const useNotificationApi = () => {
    const context = useContext(NotificationApiContext);
    if (!context) {
        throw new Error('useNotificationApi must be used within a NotificationProvider');
    }
    return context;
};
export default useNotificationApi;
