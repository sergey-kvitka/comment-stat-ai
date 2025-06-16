import axios from 'axios';
import { Box, Typography, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider, Button, DialogTitle, Dialog, DialogContent, DialogActions } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Tag from './Tag';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TagTree from '../components/TagTree';
import useNotificationApi from '../contexts/NotificationContext';

const COLORS = [
    '#4cbf40',
    '#f44336',
    '#2196f3',
    '#ff9800',
    '#9c27b0',
    '#9e9e9e',
    '#4caf50',
    '#f44336',
    '#ff9800',
];

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

const StatComparison = () => {

    const [allTags, setAllTags] = useState([]);

    const [leftTag, setLeftTag] = useState(null);
    const [rightTag, setRightTag] = useState(null);
    const [newTag, setNewTag] = useState(null);

    const [leftSelecting, setLeftSelecting] = useState(false);
    const [tagSelectDialogOpened, setTagSelectDialogOpened] = useState(false);

    const [data, setData] = useState(
        // {
        //     general: {
        //         totalAmount: 1033,
        //         commonAmount: 468
        //     },
        //     first: {
        //         tag: {
        //             id: "623",
        //             name: "Май 2025",
        //             color: "#b78648",
        //             path: "/Озон/Пункты выдачи/Саратов/Тархова 40/Май 2025",
        //             userId: 7352,
        //             parentId: "551"
        //         },
        //         amount: 468,
        //         analyzed: 437,
        //         averageLength: 322.851,
        //         emotions: {
        //             joy: 316,
        //             anger: 28,
        //             sadness: 19,
        //             fear: 3,
        //             surprise: 15,
        //             neutral: 56
        //         },
        //         sentiments: {
        //             positive: 321,
        //             negative: 55,
        //             neutral: 61
        //         }
        //     },
        //     second: {
        //         tag: {
        //             id: "624",
        //             name: "Май-июнь 2025",
        //             color: "#4a8c48",
        //             path: "/Озон/Пункты выдачи/Саратов/Тархова 40/Май-июнь 2025",
        //             userId: 7352,
        //             parentId: "551"
        //         },
        //         amount: 1033,
        //         analyzed: 995,
        //         averageLength: 298.4,
        //         emotions: {
        //             joy: 811,
        //             anger: 45,
        //             sadness: 52,
        //             fear: 8,
        //             surprise: 38,
        //             neutral: 72
        //         },
        //         sentiments: {
        //             positive: 799,
        //             negative: 99,
        //             neutral: 103
        //         }
        //     }
        // }
    );

    const { defaultSuccessNotification, defaultErrorNotification } = useNotificationApi();

    const openTagSelectMenu = useCallback(tagToSelect => {
        setLeftSelecting(tagToSelect === 'left');
        setTagSelectDialogOpened(true);
    }, []);

    const loadComparison = useCallback(async () => {
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}/api/stat/compare`,
                {
                    firstTagId: leftTag.id,
                    secondTagId: rightTag.id,
                },
                { withCredentials: true }
            );
            setData(response.data);
            defaultSuccessNotification('Статистика сформирована');
        } catch (err) {
            console.error(err);
            defaultErrorNotification(mapErrorAfterReq(err), 'Ошибка загрузки статистики');
        }
    }, []);

    const handleTagClick = useCallback(tag => {
        (leftSelecting ? setLeftTag : setRightTag)(tag);
    }, [leftSelecting]);

    const loadTags = useCallback(async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}/api/tag/all`,
                { withCredentials: true }
            );
            setAllTags(response.data.tags);
        } catch (err) {
            defaultErrorNotification(mapErrorAfterReq(err), 'Ошибка загрузки тегов');
        }
    }, [defaultErrorNotification]);

    useEffect(() => {
        loadTags();
    }, [loadTags]);

    const prepareEmotionData = emotions => {
        return Object.keys(emotions).map(key => ({
            name: emotionMap[key],
            value: emotions[key],
            originalKey: key
        }));
    };

    const prepareSentimentData = sentiments => {
        return Object.keys(sentiments).map(key => ({
            name: sentimentMap[key],
            value: sentiments[key],
            originalKey: key
        }));
    };

    const firstEmotions = prepareEmotionData(data.first.emotions);
    const secondEmotions = prepareEmotionData(data.second.emotions);
    const firstSentiments = prepareSentimentData(data.first.sentiments);
    const secondSentiments = prepareSentimentData(data.second.sentiments);

    const calculatePercentage = (value, total) => {
        return total > 0 ? (value / total * 100) : 0;
    };

    const formatNumber = (num, decimals = 1) => {
        return num.toFixed(decimals);
    };

    const calculateDifference = (firstVal, firstTotal, secondVal, secondTotal) => {
        const firstPercent = calculatePercentage(firstVal, firstTotal);
        const secondPercent = calculatePercentage(secondVal, secondTotal);
        const absDiff = secondVal - firstVal;
        const percentDiff = secondPercent - firstPercent;
        const percentageChange = firstPercent > 0 ? (percentDiff / firstPercent * 100) : 0;

        return {
            absDiff,
            percentDiff,
            percentageChange,
            firstPercent,
            secondPercent
        };
    };

    const renderComparisonTable = (title, firstData, secondData, totalKey = 'analyzed') => {
        return (
            <TableContainer component={Paper} sx={{ mt: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ p: 1 }}>
                    {title}
                </Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Метрика</TableCell>
                            <TableCell align="right">{data.first.tag.name}</TableCell>
                            <TableCell align="right">{data.second.tag.name}</TableCell>
                            <TableCell align="right">Абс. разница</TableCell>
                            <TableCell align="right">Разн. доля</TableCell>
                            <TableCell align="right">% изменения</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {firstData.map((item, index) => {
                            const secondItem = secondData.find(i => i.originalKey === item.originalKey);
                            const firstTotal = data.first[totalKey];
                            const secondTotal = data.second[totalKey];

                            const {
                                absDiff,
                                percentDiff,
                                percentageChange,
                                firstPercent,
                                secondPercent
                            } = calculateDifference(item.value, firstTotal, secondItem.value, secondTotal);

                            const isDiffPositive = absDiff >= 0;
                            const isPercentDiffPositive = percentDiff >= 0;

                            return (
                                <TableRow key={index}>
                                    <TableCell component="th" scope="row">{item.name}</TableCell>
                                    <TableCell align="right">
                                        {item.value} ({formatNumber(firstPercent)}%)
                                    </TableCell>
                                    <TableCell align="right">
                                        {secondItem.value} ({formatNumber(secondPercent)}%)
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{ color: isDiffPositive ? 'success.main' : 'error.main' }}
                                    >
                                        {absDiff >= 0 ? '+' : ''}{absDiff}
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{ color: isPercentDiffPositive ? 'success.main' : 'error.main' }}
                                    >
                                        {percentDiff >= 0 ? '+' : ''}{formatNumber(percentDiff)}%
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{ color: isPercentDiffPositive ? 'success.main' : 'error.main' }}
                                    >
                                        {firstPercent > 0 && (
                                            <span>{percentageChange >= 0 ? '+' : ''}{formatNumber(percentageChange)}%</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderMainMetricsComparison = () => {
        const metrics = [
            {
                name: 'Всего комментариев',
                first: data.first.amount,
                second: data.second.amount,
                isPercentage: false
            },
            {
                name: 'Проанализировано',
                first: data.first.analyzed,
                second: data.second.analyzed,
                isPercentage: false
            },
            {
                name: 'Средняя длина',
                first: data.first.averageLength,
                second: data.second.averageLength,
                isPercentage: false,
                isDecimal: true
            },
            {
                name: 'Процент анализа',
                first: calculatePercentage(data.first.analyzed, data.first.amount),
                second: calculatePercentage(data.second.analyzed, data.second.amount),
                isPercentage: true
            }
        ];

        return (
            <TableContainer component={Paper} sx={{ mt: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ p: 1 }}>
                    Сравнение основных метрик
                </Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Метрика</TableCell>
                            <TableCell align="right">{data.first.tag.name}</TableCell>
                            <TableCell align="right">{data.second.tag.name}</TableCell>
                            <TableCell align="right">Абс. разница</TableCell>
                            <TableCell align="right">Отн. разница</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {metrics.map((metric, index) => {
                            const diff = metric.second - metric.first;
                            const percentageChange = metric.first > 0 ? (diff / metric.first * 100) : 0;
                            const isPositive = diff >= 0;

                            const displayFirst = metric.isPercentage ?
                                `${formatNumber(metric.first)}%` :
                                (metric.isDecimal ? formatNumber(metric.first) : metric.first);

                            const displaySecond = metric.isPercentage ?
                                `${formatNumber(metric.second)}%` :
                                (metric.isDecimal ? formatNumber(metric.second) : metric.second);

                            const displayDiff = metric.isDecimal ?
                                formatNumber(diff) :
                                (diff >= 0 ? '+' : '') + formatNumber(diff);

                            const displayPercentageDiff = metric.isPercentage ?
                                `${formatNumber(metric.second - metric.first)}%` :
                                `${percentageChange >= 0 ? '+' : ''}${formatNumber(percentageChange)}%`;

                            return (
                                <TableRow key={index}>
                                    <TableCell component="th" scope="row">{metric.name}</TableCell>
                                    <TableCell align="right">{displayFirst}</TableCell>
                                    <TableCell align="right">{displaySecond}</TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{ color: isPositive ? 'success.main' : 'error.main' }}
                                    >
                                        {displayDiff}
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{ color: isPositive ? 'success.main' : 'error.main' }}
                                    >
                                        {displayPercentageDiff}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderPieChart = (data, title) => (
        <Box sx={{ mb: 3, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>{title}</Typography>
            <ResponsiveContainer width="100%" height={300} style={{ fontFamily: 'Arial' }}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length + (title.toLowerCase().includes('настроени') ? 6 : 0)]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}`, 'Количество']} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </Box>
    );

    return <>
        <Dialog
            open={tagSelectDialogOpened}
            onClose={() => setTagSelectDialogOpened(false)}
            sx={{ minWidth: '50vw' }}
        >
            <DialogTitle>Выбор {leftSelecting ? "левого" : "правого"} тега</DialogTitle>
            <DialogContent>
                <Box>
                    <p>Выбранный тег:</p>
                    {(leftSelecting ? leftTag : rightTag)
                        ? ((tag => <Tag text={tag.name} color={tag.color} />)(leftSelecting ? leftTag : rightTag))
                        : <p><i>Не выбрано</i></p>
                    }
                </Box>
                <TagTree
                    tags={allTags}
                    onTagClick={handleTagClick}
                    maxHeight={'50vh'}
                    flex={1}
                />
            </DialogContent>
            <DialogActions>
                <Button
                    variant='contained'
                    onClick={setTagSelectDialogOpened(false)}
                    sx={{ marginLeft: 'auto' }}
                >Закрыть</Button>
            </DialogActions>
        </Dialog>
        <Box>
            <Typography variant="h5" gutterBottom>Сравнение статистики</Typography>
            <Box className='comparison-selected-tags'>
                <p className='p2'>Левый тег:</p>
                {leftTag
                    ? <Tag text={leftTag.name} color={leftTag.color} />
                    : <p
                        onClick={() => openTagSelectMenu('left')}
                        title="Выбрать левый тег"
                        className='p3'
                    ><i>{"<Не выбрано>"}</i></p>
                }
                <p className='p4'>Правый тег:</p>
                {rightTag
                    ? <Tag text={rightTag.name} color={rightTag.color} />
                    : <p
                        onClick={() => openTagSelectMenu('right')}
                        title="Выбрать правый тег"
                        className='p5'
                    ><i>{"<Не выбрано>"}</i></p>
                }
                <Button
                    color='success'
                    variant='contained'
                    size='small'
                    onClick={loadComparison}
                    disabled={!leftTag || !rightTag}
                >Сравнить</Button>
            </Box>

            {!data ? <h4>Выберите теги и выполните сравнение для отображения статистики</h4> : <>
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Общие метрики</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Typography>Всего комментариев: {data.general.totalAmount}</Typography>
                            <Typography>Общих комментариев: {data.general.commonAmount}</Typography>
                        </Grid>
                        <p></p>
                        <p></p>
                        <Grid item xs={6}>
                            <Typography>Покрытие первого тега: {formatNumber(calculatePercentage(data.first.amount, data.general.totalAmount))}%</Typography>
                            <Typography>Покрытие второго тега: {formatNumber(calculatePercentage(data.second.amount, data.general.totalAmount))}%</Typography>
                        </Grid>
                    </Grid>
                </Paper>

                <Grid container spacing={3} sx={{ display: 'flex' }}>
                    <Grid item xs={6} sx={{ flex: 1 }}>
                        <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Tag
                                text={data.first.tag.name}
                                color={data.first.tag.color}
                                styles={{ width: 'fit-content', fontSize: 28, padding: '24px 12px', alignSelf: 'center', mb: 2 }}
                            />
                            {renderPieChart(firstEmotions, "Распределение эмоций")}
                            <Divider sx={{ my: 2 }} />
                            {renderPieChart(firstSentiments, "Настроения")}
                        </Paper>
                    </Grid>

                    <Grid item xs={6} sx={{ flex: 1 }}>
                        <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Tag
                                text={data.second.tag.name}
                                color={data.second.tag.color}
                                styles={{ width: 'fit-content', fontSize: 28, padding: '24px 12px', alignSelf: 'center', mb: 2 }}
                            />
                            {renderPieChart(secondEmotions, "Распределение эмоций")}
                            <Divider sx={{ my: 2 }} />
                            {renderPieChart(secondSentiments, "Настроения")}
                        </Paper>
                    </Grid>
                </Grid>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                    <Grid item xs={12}>
                        {renderComparisonTable("Сравнение эмоций", firstEmotions, secondEmotions)}
                    </Grid>
                    <Grid item xs={12}>
                        {renderComparisonTable("Сравнение настроений", firstSentiments, secondSentiments)}
                    </Grid>
                    <Grid item xs={12}>
                        {renderMainMetricsComparison()}
                    </Grid>
                </Grid>
            </>
            }
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

export default StatComparison;