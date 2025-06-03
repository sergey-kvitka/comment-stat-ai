import axios from 'axios';
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import useNotificationApi from "./NotificationContext";

export const StatContext = createContext();

export const useStatContext = () => useContext(StatContext);

const StatsProvider = ({ children }) => {
    const [stats, setStats] = useState(null);

    const { defaultErrorNotification } = useNotificationApi();

    const updateStats = useCallback(async () => {
        try {
            const data = await fetchStats();
            setStats(data);
        } catch (err) {
            console.error(err);
            defaultErrorNotification(mapErrorAfterReq(err), 'Ошибка загрузки статистики');
        }
    }, []);

    useEffect(() => {
        updateStats();
    }, [updateStats]);

    return (
        <StatContext.Provider value={{ stats, updateStats }}>
            {children}
        </StatContext.Provider>
    );
};

async function fetchStats() {
    // todo: server request for data
    const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/stat/all`,
        { withCredentials: true }
    );
    return response.data.stats;
}

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

export default StatsProvider;