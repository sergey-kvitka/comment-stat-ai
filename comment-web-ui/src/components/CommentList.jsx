import React, { useCallback, useState } from 'react';
import {
    List, ListItem, ListItemIcon, Checkbox, ListItemText, Typography, Divider, Chip, Box,
    Paper, Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress
} from '@mui/material';
import { NoteAdd, EditSquare } from '@mui/icons-material';
import useNotificationApi from '../contexts/NotificationContext';
import Tag from './Tag';
import EditComments from './EditComments';

const sentimentMap = {
    positive: { color: '#00BB00', text: 'Позитивный' },
    neutral: { color: '#AAAAAA', text: 'Нейтральный' },
    negative: { color: '#EE0000', text: 'Негативный' }
};
const emotionMap = {
    joy: { color: '#00BB00', text: 'Радость' },
    anger: { color: '#EE0000', text: 'Злость' },
    fear: { color: '#7F2180', text: 'Страх' },
    surprise: { color: '#22ACBB', text: 'Удивление' },
    sadness: { color: '#152BA7', text: 'Грусть' },
    neutral: { color: '#AAAAAA', text: 'Нет эмоции' },
};

const CommentList = ({ comments, tags, tagList, onAddComment, onEditComments, onAnalyze, errMapper }) => {
    const [selected, setSelected] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { notification } = useNotificationApi();

    // Обработчики для выбора комментариев
    const handleToggle = id => {
        const currentIndex = selected.indexOf(id);
        const newSelected = [...selected];
        if (currentIndex === -1) {
            newSelected.push(id);
        } else {
            newSelected.splice(currentIndex, 1);
        }
        setSelected(newSelected);
        setSelectAll(newSelected.length === comments.length);
    };

    const handleSelectAll = () => {
        setSelected(selectAll ? [] : comments.map(comment => comment.id));
        setSelectAll(prev => !prev);
    };

    const handleDialogClose = () => {
        setIsCreateDialogOpen(false);
        setNewCommentText('');
    };

    const handleCommentSubmit = useCallback(async () => {
        if (!newCommentText.trim()) return;
        setIsLoading(true);
        try {
            await onAddComment(newCommentText);
            notification('Комментарий успешно создан!', null, { severity: 'success' });
            handleDialogClose();
        } catch (err) {
            const error = errMapper(err);
            notification(
                error.message,
                error.isNetworkError ? 'Сетевая ошибка' : 'Ошибка создания комментария',
                { severity: 'error', autoHideDuration: 10000 }
            );
        } finally {
            setIsLoading(false);
        }
    }, [errMapper, newCommentText, notification, onAddComment]);

    const handleCommentsEdit = useCallback(async updates => {
        try {
            await onEditComments({ commentIds: selected, ...updates });
            const single = (selected.length === 1);
            notification(
                `Комментари${single ? 'й' : 'и'} успешно измен${single ? 'ён' : 'ены'}!`,
                null,
                { severity: 'success' }
            );
            setIsEditDialogOpen(false);
        } catch (err) {
            const error = mapErrorAfterReq(err);
            notification(
                error.message,
                error.isNetworkError ? 'Сетевая ошибка' : 'Ошибка редактирования комментариев',
                { severity: 'error', autoHideDuration: 10000 }
            );
        }
    }, [onEditComments, selected, setIsEditDialogOpen, notification]);

    const formatDate = dateStr => {
        try {
            return new Date(dateStr).toLocaleString();
        } catch {
            return dateStr;
        }
    };

    const commentClasses = comment => {
        if (!comment.sentiment || !comment.emotion) {
            return <Chip
                sx={{
                    background: '#888888',
                    color: 'white'
                }}
                label={'Не проанализирован'}
                size="small"
            />
        }
        // todo общий источник
        const sentimentData = sentimentMap[comment.sentiment];
        const emotionData = emotionMap[comment.emotion];
        // todo Chip -> Tag
        return <>
            <Chip
                label={sentimentData.text}
                sx={{ background: sentimentData.color, color: 'white' }}
                size="small"
            />
            <Chip
                label={emotionData.text}
                sx={{ background: emotionData.color, color: 'white' }}
                size="small"
            />
        </>;
    };

    const renderTags = (comment) => {
        return comment.tagIds?.map(tagId => {
            const tag = tags[tagId];
            if (!tag) return null;
            return <Tag key={tagId} text={tag.name} color={tag.color} styles={{ mt: 1, mr: '5px' }} />;
        });
    };

    const commentToElement = comment => (
        <React.Fragment key={comment.id}>
            <ListItem component="div" disablePadding>
                <ListItemIcon sx={{ minWidth: 0 }}>
                    <Checkbox
                        edge="start"
                        checked={selected.includes(comment.id)}
                        onChange={() => handleToggle(comment.id)}
                        sx={{ marginRight: 1 }}
                    />
                </ListItemIcon>
                <ListItemText
                    primary={
                        <Typography component="div" variant="body1" sx={{ marginTop: 0.5, marginRight: 2 }}>
                            {comment.text}
                        </Typography>
                    }
                    secondary={
                        <>
                            <Box
                                component="div"
                                sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                {commentClasses(comment)}
                                <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{ marginLeft: 'auto', marginRight: '20px' }}
                                >
                                    <NoteAdd sx={{ transform: 'translateY(6px)', marginRight: 1.25 }} fontSize='small' />
                                    {formatDate(comment.createdStr)}
                                    <br />
                                    <EditSquare sx={{ transform: 'translateY(6px)', marginRight: 1.25 }} fontSize='small' />
                                    {formatDate(comment.modifiedStr)}
                                </Typography>
                            </Box>
                            {renderTags(comment)}
                        </>
                    }
                    disableTypography
                />
            </ListItem>
            <Divider component="div" />
        </React.Fragment>
    );

    return <
        Paper elevation={3} sx={{
            padding: 2,
            margin: 2,
            height: '700px',
            overflow: 'hidden'
        }}
    >
        <Box
            component="div"
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 2
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                    edge="start"
                    checked={selectAll}
                    indeterminate={selected.length > 0 && selected.length < comments.length}
                    onChange={handleSelectAll}
                />
                <Typography component="h2" variant="h6">
                    Комментарии ({comments.length})
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                    variant="outlined"
                    color="success"
                    disabled={!selected.length}
                    onClick={() => setIsEditDialogOpen(true)}
                >
                    Редактировать комментарии
                </Button>
                <Button
                    variant="contained"
                    onClick={() => setIsCreateDialogOpen(true)}
                    sx={{ mx: 1.5 }}
                >
                    Добавить комментарий
                </Button>
                <Button
                    variant="contained"
                    color="success"
                    onClick={() => onAnalyze(selected)}
                >
                    Анализировать
                </Button>
            </Box>
        </Box>

        <List
            component="div"
            sx={{
                height: '630px',
                overflowY: 'auto'
            }}
        >
            {comments.map(commentToElement)}
        </List>

        <Dialog
            open={isCreateDialogOpen}
            onClose={handleDialogClose}
        >
            <DialogTitle>Новый комментарий</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Текст комментария"
                    fullWidth
                    variant="outlined"
                    multiline
                    rows={4}
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleDialogClose}>Отмена</Button>
                <Button
                    onClick={handleCommentSubmit}
                    variant="contained"
                    disabled={!newCommentText.trim() || isLoading}
                >
                    {isLoading ? <CircularProgress size={24} /> : 'Сохранить'}
                </Button>
            </DialogActions>
        </Dialog>
        <EditComments
            open={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            onEdit={handleCommentsEdit}
            amount={selected.length}
            singleComment={selected.length === 1 ? comments.find(c => c.id === selected[0]) : undefined}
            tags={tagList}
        />
    </Paper>;
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

export default CommentList;