import React, { useState } from 'react';
import {
    List,
    ListItem,
    ListItemIcon,
    Checkbox,
    ListItemText,
    Typography,
    Divider,
    Chip,
    Box,
    Paper,
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    CircularProgress
} from '@mui/material';

const CommentList = ({ comments = [], onAddComment }) => {
    const [selected, setSelected] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Обработчики для выбора комментариев
    const handleToggle = (id) => {
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
        if (selectAll) {
            setSelected([]);
        } else {
            setSelected(comments.map(comment => comment.id));
        }
        setSelectAll(!selectAll);
    };

    // Обработчики для добавления комментария
    const handleAddCommentClick = () => {
        setIsDialogOpen(true);
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setNewCommentText('');
    };

    const handleCommentSubmit = async () => {
        if (!newCommentText.trim()) return;

        setIsLoading(true);
        try {
            await onAddComment(newCommentText);
            handleDialogClose();
        } catch (error) {
            console.error('Ошибка при добавлении комментария:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        try {
            return new Date(dateStr).toLocaleString();
        } catch {
            return dateStr;
        }
    };

    return <
        Paper elevation={3} sx={{ padding: 2, margin: 2 }}
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

            <Button
                variant="contained"
                onClick={handleAddCommentClick}
            >
                Добавить комментарий
            </Button>
        </Box>

        {/* Диалог добавления нового комментария */}
        <Dialog open={isDialogOpen} onClose={handleDialogClose}>
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
                    onChange={(e) => setNewCommentText(e.target.value)}
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

        {/* Список комментариев */}
        <List component="div">
            {comments.map((comment) => (
                <React.Fragment key={comment.id}>
                    <ListItem component="div" disablePadding>
                        <ListItemIcon>
                            <Checkbox
                                edge="start"
                                checked={selected.includes(comment.id)}
                                onChange={() => handleToggle(comment.id)}
                            />
                        </ListItemIcon>

                        <ListItemText
                            primary={
                                <Typography component="div" variant="body1">
                                    {comment.text}
                                </Typography>
                            }
                            secondary={
                                <Box
                                    component="div"
                                    sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 1,
                                        marginTop: 1,
                                        alignItems: 'center'
                                    }}
                                >
                                    <Chip
                                        label={`Настроение: ${comment.sentiment || 'не проанализирован'}`}
                                        color={comment.sentiment ? 'primary' : 'default'}
                                        size="small"
                                    />
                                    <Chip
                                        label={`Эмоция: ${comment.emotion || 'не проанализирован'}`}
                                        color={comment.emotion ? 'secondary' : 'default'}
                                        size="small"
                                    />
                                    <Typography
                                        component="span"
                                        variant="caption"
                                        sx={{ marginLeft: 'auto' }}
                                    >
                                        {formatDate(comment.modifiedStr)}
                                    </Typography>
                                </Box>
                            }
                            disableTypography
                        />
                    </ListItem>
                    <Divider component="div" />
                </React.Fragment>
            ))}
        </List>
    </Paper>
};

export default CommentList;