import React, { useCallback, useState } from 'react';
import {
    List, ListItem, ListItemIcon, Checkbox, ListItemText, Typography, Divider, Box, Paper,
    Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress
} from '@mui/material';
import { NoteAdd, EditSquare, Delete, ManageSearch, Add, Edit } from '@mui/icons-material';
import useNotificationApi from '../contexts/NotificationContext';
import Tag from './Tag';
import EditComments from './EditComments';

const sentimentMap = {
    "null": { color: '#888888', text: 'Не проанализирован' },
    positive: { color: '#00BB00', text: 'Позитивный' },
    neutral: { color: '#AAAAAA', text: 'Нейтральный' },
    negative: { color: '#EE0000', text: 'Негативный' }
};
const emotionMap = {
    "null": { color: '#888888', text: 'Не проанализирован' },
    joy: { color: '#00BB00', text: 'Радость' },
    anger: { color: '#EE0000', text: 'Злость' },
    fear: { color: '#7F2180', text: 'Страх' },
    surprise: { color: '#22ACBB', text: 'Удивление' },
    sadness: { color: '#152BA7', text: 'Грусть' },
    neutral: { color: '#AAAAAA', text: 'Нет эмоции' },
};

const CommentList = ({
    comments,
    tags,
    tagList,
    onAddComment,
    onEditComments,
    onDeleteComments,
    onAnalyze,
    selected,
    setSelected,
    errMapper
}) => {
    const [selectAll, setSelectAll] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { defaultSuccessNotification, defaultErrorNotification } = useNotificationApi();

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
            defaultSuccessNotification('Комментарий успешно создан!');
            handleDialogClose();
        } catch (err) {
            defaultErrorNotification(errMapper(err), 'Ошибка создания комментария');
        } finally {
            setIsLoading(false);
        }
    }, [onAddComment, errMapper, newCommentText, defaultSuccessNotification, defaultErrorNotification]);

    const handleCommentsEdit = useCallback(async (updates, callback) => {
        try {
            await onEditComments({ commentIds: selected, ...updates });
            const single = (selected.length === 1);
            defaultSuccessNotification(`Комментари${single ? 'й' : 'и'} успешно измен${single ? 'ён' : 'ены'}!`);
            setIsEditDialogOpen(false);
            callback();
        } catch (err) {
            defaultErrorNotification(mapErrorAfterReq(err), 'Ошибка редактирования комментариев');
        }
    }, [onEditComments, selected, setIsEditDialogOpen, defaultSuccessNotification, defaultErrorNotification]);

    const handleCommentsDelete = useCallback(async () => {
        try {
            await onDeleteComments(selected);
            setSelected([]);
            const single = (selected.length === 1);
            defaultSuccessNotification(`Комментари${single ? 'й' : 'и'} успешно удал${single ? 'ён' : 'ены'}!`);
        } catch (err) {
            defaultErrorNotification(mapErrorAfterReq(err), 'Ошибка удаления комментариев');
        }
    }, [onDeleteComments, selected, setSelected, defaultSuccessNotification, defaultErrorNotification]);

    const formatDate = dateStr => {
        try {
            return new Date(dateStr).toLocaleString();
        } catch {
            return dateStr;
        }
    };

    const commentClasses = comment => {
        // todo общий источник
        const sentimentData = sentimentMap[comment.sentiment ?? "null"];
        const emotionData = emotionMap[comment.emotion ?? "null"];
        return <>
            <Tag
                text={sentimentData.text}
                color={sentimentData.color}
                styles={{ color: 'white' }}
            />
            {(comment.sentiment || comment.emotion) && <Tag
                text={emotionData.text}
                color={emotionData.color}
                styles={{ color: 'white' }}
            />}
        </>;
    };

    const renderTags = (comment) => {
        return comment.tagIds?.map(tagId => {
            const tag = tags[tagId];
            if (!tag) return null;
            return <Tag
                key={tagId}
                text={tag.name}
                color={tag.color}
                title={tag.path}
                styles={{ my: 0.2, mr: '5px' }}
            />;
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
            <Box sx={{ display: 'flex', gap: 2.5 }}>
                <Button
                    variant="outlined"
                    color="error"
                    disabled={!selected.length}
                    onClick={handleCommentsDelete}
                    startIcon={<Delete />}
                >
                    Удалить
                </Button>
                <Button
                    variant="outlined"
                    color="success"
                    disabled={!selected.length}
                    onClick={() => setIsEditDialogOpen(true)}
                    startIcon={<Edit />}
                >
                    Редактировать комментарии
                </Button>
                <Button
                    variant="contained"
                    onClick={() => setIsCreateDialogOpen(true)}
                    startIcon={<Add />}
                >
                    Добавить комментарий
                </Button>
                <Button
                    variant="contained"
                    color="success"
                    onClick={() => onAnalyze(selected)}
                    startIcon={<ManageSearch />}
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