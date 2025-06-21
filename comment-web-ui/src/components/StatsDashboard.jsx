import { parse } from 'date-fns';
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import StatComparison from './StatComparison';
import { useNavigate } from 'react-router-dom';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { formatISO } from 'date-fns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { ruRU } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';

import {
    Box,
    Typography,
    Paper,
    Grid,
    Tabs,
    Tab,
    CircularProgress,
    Button
} from '@mui/material';
import {
    LineChart,
    BarChart,
    PieChart,
    Line,
    Bar,
    Pie,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import useNotificationApi from '../contexts/NotificationContext';
import Header from './Header';

// Цвета для различных категорий
const COLORS = {
    sentiment: {
        positive: '#4caf50',
        neutral: '#ff9800',
        negative: '#f44336'
    },
    emotion: {
        joy: '#4caf50',
        sadness: '#2196f3',
        anger: '#f44336',
        fear: '#9c27b0',
        neutral: '#9e9e9e',
        surprise: '#ff9800'
    },
    formats: {
        json: '#4caf50',
        xml: '#f44336',
        csv: '#2196f3',
        txt: '#9c27b0',
    },
    time: '#673ab7',
    import: '#3f51b5',
    export: '#009688'
};

const emotionMap = {
    joy: 'Радость',
    anger: 'Злость',
    sadness: 'Грусть',
    surprise: 'Удивление',
    fear: 'Страх',
    neutral: 'Нет эмоции'
};

const sentimentMap = {
    positive: 'Позитивные',
    negative: 'Негативные',
    neutral: 'Нейтральные'
};

const dateTimeFormat = 'DD.MM.YYYY';
const localeText = ruRU.components.MuiLocalizationProvider.defaultProps.localeText;
localeText.okButtonLabel = 'ОК';
localeText.cancelButtonLabel = 'Отмена';

const getDateWeekAgo = () => {
    const dateWeekAgo = new Date();
    dateWeekAgo.setDate(dateWeekAgo.getDate() - 21);
    dateWeekAgo.setHours(0, 0, 0, 0);
    return dayjs(dateWeekAgo);
};

const getDateToday = () => {
    const dateToday = new Date();
    dateToday.setHours(23, 59, 59, 999);
    return dayjs(dateToday);
};

const dateSorter = (a, b) => parse(a.date, 'dd.MM.yyyy', new Date()) - parse(b.date, 'dd.MM.yyyy', new Date());

const StatsDashboard = () => {

    const [dateFrom, setDateFrom] = useState(getDateWeekAgo());
    const [dateTo, setDateTo] = useState(getDateToday());

    const [newDateFrom, setNewDateFrom] = useState(getDateWeekAgo());
    const [newDateTo, setNewDateTo] = useState(getDateToday());

    const [isPeriodValid, setIsPeriodValid] = useState(true);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);

    const { notification, defaultErrorNotification } = useNotificationApi();

    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.post(
                    `${process.env.REACT_APP_BACKEND_URL}/api/stat/findByPeriod`,
                    {
                        from: formatISO(dateFrom.toDate()),
                        to: formatISO(dateTo.toDate())
                    },
                    { withCredentials: true }
                );
                const rawData = response.data || { stats: [] };
                setData(processData(rawData));
                setLoading(false);
                if (!rawData.stats.length) {
                    notification(
                        'Не удалось найти статистические данные',
                        null, { severity: 'warning' }
                    );
                }
            } catch (err) {
                console.error(err);
                defaultErrorNotification(mapErrorAfterReq(err), 'Ошибка загрузки комментариев');
                setLoading(false);
            }
        };
        fetchData();
    }, [notification, defaultErrorNotification, dateFrom, dateTo]);

    useEffect(() => {
        const [fromJs, toJs] = [newDateFrom?.toDate(), newDateTo?.toDate()];
        setIsPeriodValid(
            fromJs && toJs
            && fromJs < toJs
            && fromJs.setHours(0, 0, 0, 0) !== toJs.setHours(0, 0, 0, 0)
        )
    }, [newDateFrom, newDateTo]);

    const updatePeriod = useCallback(() => {
        setDateFrom(newDateFrom);
        setDateTo(newDateTo);
    }, [newDateFrom, newDateTo]);

    const processData = rawData => {
        const stats = rawData['stats'];

        // Группировка по дням для временных графиков
        const dailyData = {};

        // Данные для анализа комментариев
        const analysisData = {
            manual: { sentiment: {}, emotion: {} },
            ai: { sentiment: {}, emotion: {} },
            time: []
        };

        // Данные для импорта/экспорта
        const importExportData = {
            import: { byType: {}, daily: {} },
            export: { byType: {}, daily: {} }
        };

        stats.forEach(item => {
            const date = new Date(item.savedAt);
            const dayKey = format(date, 'dd.MM.yyyy');

            // Обработка данных анализа комментариев
            if (item.action.includes('comment-analysis')) {
                if (item.action === 'comment-analysis-time') {
                    analysisData.time.push({
                        date: date,
                        value: parseFloat(item.value),
                        amount: item.amount
                    });
                } else {
                    const analysisType = item.action.includes('manual') ? 'manual' : 'ai';
                    const category = item.type;
                    const val = item.value;

                    if (!analysisData[analysisType][category][val]) {
                        analysisData[analysisType][category][val] = 0;
                    }
                    analysisData[analysisType][category][val] += item.amount;

                    // Для временных графиков
                    if (!dailyData[dayKey]) {
                        dailyData[dayKey] = {
                            date: dayKey,
                            manualSentiment: {},
                            manualEmotion: {},
                            aiSentiment: {},
                            aiEmotion: {}
                        };
                    }

                    const prefix = analysisType === 'manual' ? 'manual' : 'ai';
                    const typeKey = `${prefix}${category.charAt(0).toUpperCase() + category.slice(1)}`;

                    if (!dailyData[dayKey][typeKey][val]) {
                        dailyData[dayKey][typeKey][val] = 0;
                    }
                    dailyData[dayKey][typeKey][val] += item.amount;
                }
            }

            // Обработка импорта/экспорта
            if (item.action.includes('comment-data-')) {
                const actionType = item.action.includes('import') ? 'import' : 'export';
                const fileType = item.type;

                // По типам файлов
                if (!importExportData[actionType].byType[fileType]) {
                    importExportData[actionType].byType[fileType] = 0;
                }
                importExportData[actionType].byType[fileType] += item.amount;

                // По дням
                if (!importExportData[actionType].daily[dayKey]) {
                    importExportData[actionType].daily[dayKey] = {
                        date: dayKey,
                        total: 0,
                        byType: {}
                    };
                }
                importExportData[actionType].daily[dayKey].total += item.amount;

                if (!importExportData[actionType].daily[dayKey].byType[fileType]) {
                    importExportData[actionType].daily[dayKey].byType[fileType] = 0;
                }
                importExportData[actionType].daily[dayKey].byType[fileType] += item.amount;
            }
        });

        // Преобразование dailyData в массив для графиков
        const dailyAnalysisArray = Object.values(dailyData).map(day => {
            const result = { date: day.date };
            // Суммируем значения для каждого типа
            ['manualSentiment', 'manualEmotion', 'aiSentiment', 'aiEmotion'].forEach(type => {
                const dayData = JSON.parse(JSON.stringify(day[type])); // copying object
                Object.getOwnPropertyNames(
                    type.toLowerCase().includes('emotion')
                        ? emotionMap
                        : sentimentMap
                )
                    .filter(key => !Boolean(dayData[key]))
                    .forEach(key => { dayData[key] = 0; })
                    ;
                for (const [key, value] of Object.entries(dayData)) {
                    result[`${type}_${key}`] = value;
                }
            });
            return result;
        }).sort(dateSorter);

        // Преобразование import/export daily в массивы
        const importDailyArray = Object.values(importExportData.import.daily).sort(dateSorter);
        const exportDailyArray = Object.values(importExportData.export.daily).sort(dateSorter);

        // Преобразование данных по типам файлов для круговых диаграмм
        const importByType = Object.entries(importExportData.import.byType).map(([name, value]) => ({ name, value }));
        const exportByType = Object.entries(importExportData.export.byType).map(([name, value]) => ({ name, value }));

        // Среднее время анализа
        console.log(analysisData.time);
        const timeData = analysisData.time.reduce((acc, item) => {
            const dayKey = format(item.date, 'dd.MM.yyyy');
            if (!acc[dayKey]) {
                acc[dayKey] = { date: dayKey, totalTime: 0, amount: 0 };
            }
            acc[dayKey].totalTime += item.value;
            acc[dayKey].amount += item.amount;
            return acc;
        }, {});

        const averageTimeArray = Object.values(timeData).map(day => ({
            date: day.date,
            averageTime: day.amount === 0 ? 0 : day.totalTime / day.amount
        })).sort(dateSorter);

        return {
            analysisData,
            dailyAnalysis: dailyAnalysisArray,
            importExportData: {
                importDaily: importDailyArray,
                exportDaily: exportDailyArray,
                importByType,
                exportByType
            },
            averageTimeData: averageTimeArray,
            sentimentEmotionDistribution: {
                ai: {
                    sentiment: Object.entries(analysisData.ai.sentiment).map(([name, value]) => ({ name, value })),
                    emotion: Object.entries(analysisData.ai.emotion).map(([name, value]) => ({ name, value }))
                },
                manual: {
                    sentiment: Object.entries(analysisData.manual.sentiment).map(([name, value]) => ({ name, value })),
                    emotion: Object.entries(analysisData.manual.emotion).map(([name, value]) => ({ name, value }))
                },
            }
        };
    };

    const handleLogout = useCallback(() => navigate('/login'), [navigate]);

    if (loading) return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px" >
            <CircularProgress />
        </Box>
    );

    if (!data) return null;

    const renderSentimentEmotionLines = (dataKeyPrefix) => {
        const sentimentKeys = Object.keys(data.analysisData.ai.sentiment);
        const emotionKeys = Object.keys(data.analysisData.ai.emotion);
        return <
            Grid container spacing={3}
        >
            <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Настроения</Typography>
                <ResponsiveContainer width={800} height={400}>
                    <LineChart data={data.dailyAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {sentimentKeys.map(key => (
                            <Line
                                key={`${dataKeyPrefix}Sentiment_${key}`}
                                type="monotone"
                                dataKey={`${dataKeyPrefix}Sentiment_${key}`}
                                stroke={COLORS.sentiment[key]}
                                name={`${sentimentMap[key]}`}
                                strokeWidth={2}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </Grid>
            <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Эмоции</Typography>
                <ResponsiveContainer width={800} height={400}>
                    <LineChart data={data.dailyAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {emotionKeys.map(key => (
                            <Line
                                key={`${dataKeyPrefix}Emotion_${key}`}
                                type="monotone"
                                dataKey={`${dataKeyPrefix}Emotion_${key}`}
                                stroke={COLORS.emotion[key]}
                                name={`${emotionMap[key]}`}
                                strokeWidth={2}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </Grid>
        </Grid>;
    };

    return <>
        <Header currentPage="dashboard" onLogout={handleLogout} />
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                <Typography variant="h4" gutterBottom sx={{ ml: 1.5 }}>Аналитика комментариев</Typography>
                {activeTab === 4 ? null : <>
                    <LocalizationProvider
                        dateAdapter={AdapterDayjs}
                        adapterLocale="ru"
                        localeText={localeText}
                    >
                        <DateTimePicker
                            key={newDateFrom ? 'filled-start' : 'empty-start'}
                            label="Начало диапазона"
                            value={newDateFrom}
                            onChange={newValue => setNewDateFrom(newValue)}
                            maxDateTime={newDateTo}
                            format={dateTimeFormat}
                            ampm={false}
                            views={['year', 'month', 'day']}
                            slotProps={{
                                textField: { fullWidth: true },
                                actionBar: { actions: ['accept', 'cancel', 'today'], },
                            }}
                            sx={{
                                ml: 4,
                                width: 175,
                                '& .MuiPickersInputBase-sectionsContainer': {
                                    padding: '12px 0 !important'
                                }
                            }}
                        />
                        <DateTimePicker
                            key={newDateTo ? 'filled-end' : 'empty-end'}
                            label="Конец диапазона"
                            value={newDateTo}
                            onChange={newValue => setNewDateTo(newValue)}
                            minDateTime={newDateFrom}
                            format={dateTimeFormat}
                            ampm={false}
                            views={['year', 'month', 'day']}
                            slotProps={{
                                textField: { fullWidth: true },
                                actionBar: {
                                    actions: ['accept', 'cancel', 'today'],
                                },
                            }}
                            sx={{
                                width: 175,
                                '& .MuiPickersInputBase-sectionsContainer': {
                                    padding: '12px 0 !important'
                                }
                            }}
                        />
                    </LocalizationProvider>
                    <Button
                        disabled={!isPeriodValid}
                        onClick={updatePeriod}
                        variant='outlined'
                    >Выбрать диапазон</Button>
                </>
                }
            </Box>

            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab label="Анализ комментариев" />
                <Tab label="Время анализа" />
                <Tab label="Импорт/Экспорт" />
                <Tab label="Распределение" />
                <Tab label="Сравнение" />
            </Tabs>

            {activeTab === 0 && (
                <Box>
                    <Typography variant="h5" gutterBottom>Разметка комментариев</Typography>

                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h5" gutterBottom>Ручная разметка</Typography>
                        {renderSentimentEmotionLines('manual')}
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h5" gutterBottom>Автоматическая разметка</Typography>
                        {renderSentimentEmotionLines('ai')}
                    </Paper>
                </Box>
            )}

            {activeTab === 1 && (
                <Box>
                    <Typography variant="h5" gutterBottom>Время анализа комментариев</Typography>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Среднее время анализа (мс)</Typography>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={data.averageTimeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="averageTime" fill={COLORS.time} name="Среднее время (мс)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Box>
            )}

            {activeTab === 2 && (
                <Box>
                    <Typography variant="h5" gutterBottom>Импорт и экспорт данных за период</Typography>

                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>Импорт данных по дням</Typography>
                                <ResponsiveContainer width={600} height={300}>
                                    <LineChart data={data.importExportData.importDaily}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="total" stroke={COLORS.import} name="Всего импортировано"
                                            strokeWidth={2}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>Экспорт данных по дням</Typography>
                                <ResponsiveContainer width={600} height={300}>
                                    <LineChart data={data.importExportData.exportDaily}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="total" stroke={COLORS.export} name="Всего экспортировано"
                                            strokeWidth={2}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>Распределение форматов импорта</Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={data.importExportData.importByType}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {data.importExportData.importByType.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS.formats[entry.name]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${value}`, 'Количество']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>Распределение форматов экспорта</Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={data.importExportData.exportByType}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {data.importExportData.exportByType.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS.formats[entry.name]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${value}`, 'Количество']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {activeTab === 3 && <>
                <Box>
                    <Typography variant="h5" gutterBottom>Выполненная разметка за период (автоматическая)</Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2, fontFamily: 'Arial' }}>
                                <Typography variant="h6" gutterBottom>Распределение настроений</Typography>
                                <ResponsiveContainer width={450} height={300}>
                                    <PieChart>
                                        <Pie
                                            data={data.sentimentEmotionDistribution.ai.sentiment}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${sentimentMap[name]} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {data.sentimentEmotionDistribution.ai.sentiment.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS.sentiment[entry.name]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${value}`, 'Количество']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2, fontFamily: 'Arial' }}>
                                <Typography variant="h6" gutterBottom>Распределение эмоций</Typography>
                                <ResponsiveContainer width={450} height={300}>
                                    <PieChart>
                                        <Pie
                                            data={data.sentimentEmotionDistribution.ai.emotion}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${emotionMap[name]} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {data.sentimentEmotionDistribution.ai.emotion.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS.emotion[entry.name]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${value}`, 'Количество']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="h5" gutterBottom>Выполненная разметка за период (ручная)</Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2, fontFamily: 'Arial' }}>
                                <Typography variant="h6" gutterBottom>Распределение настроений</Typography>
                                <ResponsiveContainer width={450} height={300}>
                                    <PieChart>
                                        <Pie
                                            data={data.sentimentEmotionDistribution.manual.sentiment}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${sentimentMap[name]} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {data.sentimentEmotionDistribution.manual.sentiment.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS.sentiment[entry.name]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${value}`, 'Количество']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2, fontFamily: 'Arial' }}>
                                <Typography variant="h6" gutterBottom>Распределение эмоций</Typography>
                                <ResponsiveContainer width={450} height={300}>
                                    <PieChart>
                                        <Pie
                                            data={data.sentimentEmotionDistribution.manual.emotion}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${emotionMap[name]} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {data.sentimentEmotionDistribution.manual.emotion.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS.emotion[entry.name]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${value}`, 'Количество']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            </>}
            {activeTab === 4 && <>
                <StatComparison />
            </>}
        </Box>
    </>;
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

export default StatsDashboard;