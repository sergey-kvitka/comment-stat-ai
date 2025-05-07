import axios from 'axios';
import CommentList from '../components/CommentList';
import Tag from '../components/Tag';
import TagTree from '../components/TagTree';
import EditTag from '../components/EditTag';

import useNotificationApi from '../contexts/NotificationContext';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress, Box,
    Stack, RadioGroup, FormControlLabel, Radio, Chip, TextField, FormControl, FormLabel,
    Typography, Paper, InputLabel, MenuItem, Select, Checkbox,
} from '@mui/material';
import {
    Add, Check as CheckIcon, Close as CloseIcon, Download, FilterAlt, Search
} from '@mui/icons-material';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { ruRU } from '@mui/x-date-pickers/locales';
import { formatISO } from 'date-fns';

import 'dayjs/locale/ru';

const dateTimeFormat = 'DD.MM.YYYY HH:mm:ss';

const localeText = ruRU.components.MuiLocalizationProvider.defaultProps.localeText;
localeText.okButtonLabel = 'ОК';
localeText.cancelButtonLabel = 'Отмена';

// todo emotion and sentiment lists being loaded from server
const emotions = [
    { desc: 'Радость', name: 'joy', color: '#00BB00' },
    { desc: 'Злость', name: 'anger', color: '#EE0000' },
    { desc: 'Страх', name: 'fear', color: '#7F2180' },
    { desc: 'Удивление', name: 'surprise', color: '#22ACBB' },
    { desc: 'Грусть', name: 'sadness', color: '#152BA7' },
    { desc: 'Нет эмоции', name: 'neutral', color: '#AAAAAA' },
];

const sentiments = [
    { desc: 'Позитивный', name: 'positive', color: '#00BB00' },
    { desc: 'Нейтральный', name: 'neutral', color: '#AAAAAA' },
    { desc: 'Негативный', name: 'negative', color: '#EE0000' },
];

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MemoizedTagTree = React.memo(TagTree);
const MemoizedCommentList = React.memo(CommentList);


// !! HomePage component
const HomePage = () => {

    const [allTags, setAllTags] = useState([]);
    const [allComments, setAllComments] = useState([]);

    // * comment filters
    const [
        [includedTags, setIncludedTags],
        [excludedTags, setExcludedTags],
        [includedSentiments, setIncludedSentiments],
        [excludedSentiments, setExcludedSentiments],
        [includedEmotions, setIncludedEmotions],
        [excludedEmotions, setExcludedEmotions],
    ] = [
            useState([]),
            useState([]),
            useState([]),
            useState([]),
            useState([]),
            useState([]),
        ];
    const [textSubstr, setTextSubstr] = useState('');
    const [analyzed, setAnalyzed] = useState('null');
    const [createdFrom, setCreatedFrom] = useState();
    const [modifiedFrom, setModifiedFrom] = useState();
    const [createdTo, setCreatedTo] = useState();
    const [modifiedTo, setModifiedTo] = useState();

    const [includeTagsSwitch, setIncludeTagsSwitch] = useState(true);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
    const [isFilterApplying, setIsFilterApplying] = useState(false);

    const [editedTag, setEditedTag] = useState({ mode: null, name: '' });

    const [selected, setSelected] = useState([]);

    const navigate = useNavigate();
    const { notification, defaultSuccessNotification, defaultErrorNotification } = useNotificationApi();

    const removeTagFromList = useCallback((id, setNewList) => {
        setNewList(prev => [...prev.filter(tag => tag.id !== id)]);
    }, []);

    const renderTag = useCallback((tag, setTagList) => <Tag
        key={tag.id}
        text={tag.name}
        color={tag.color}
        onClick={() => removeTagFromList(tag.id, setTagList)}
        styles={{
            marginBottom: '5px !important',
            '&:hover': { bgcolor: tag.color, opacity: 0.8 }
        }}
    />, [removeTagFromList]);

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

    const loadComments = useCallback(async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}/api/comment/all`,
                { withCredentials: true }
            );
            setAllComments(response.data?.comments ?? []);
        } catch (err) {
            defaultErrorNotification(mapErrorAfterReq(err), 'Ошибка загрузки комментариев');
        }
    }, [defaultErrorNotification]);

    useEffect(() => {
        loadComments();
        loadTags();
    }, [loadComments, loadTags]);

    const getCommentsByFilters = useCallback(async () => {
        const response = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}/api/comment/getByFilters`,
            {
                textSubstr: textSubstr.trim() ?? null,
                analyzed: (analyzed === 'null') ? null : Boolean(analyzed === 'true'),
                created: {
                    from: createdFrom ? formatISO(createdFrom) : null,
                    to: createdTo ? formatISO(createdTo) : null,
                },
                modified: {
                    from: modifiedFrom ? formatISO(modifiedFrom) : null,
                    to: modifiedTo ? formatISO(modifiedTo) : null,
                },
                include: {
                    tagIds: includedTags.map(tag => tag.id),
                    emotions: includedEmotions,
                    sentiments: includedSentiments,
                },
                exclude: {
                    tagIds: excludedTags.map(tag => tag.id),
                    emotions: excludedEmotions,
                    sentiments: excludedSentiments,
                },
            },
            { withCredentials: true }
        );
        if (response.status === 204) {
            return [];
        }
        if (!(response.data?.comments)) {
            notification(
                'Фильтрация: неверный формат ответа от сервера!',
                'Внутренняя ошибка',
                { severity: 'error', autoHideDuration: 10000 }
            );
            console.error('Неверный формат ответа сервера (/api/comment/getByFilters)');
            return null;
        }
        return response.data.comments;
    }, [
        notification, textSubstr, analyzed, createdFrom, createdTo, modifiedFrom, modifiedTo,
        excludedEmotions, excludedSentiments, excludedTags, includedEmotions, includedSentiments, includedTags
    ]);

    const handleLogout = useCallback(() => {
        // todo: logout endpoint
        navigate('/login');
    }, [navigate]);

    const resetFilters = useCallback(() => {
        setIncludedTags([]);
        setExcludedTags([]);
        setIncludedSentiments([]);
        setExcludedSentiments([]);
        setIncludedEmotions([]);
        setExcludedEmotions([]);
        setTextSubstr('');
        setAnalyzed('null');
        setCreatedFrom();
        setModifiedFrom();
        setCreatedTo();
        setModifiedTo();
        notification('Фильтры сброшены!', null);
    }, [
        notification,
        setIncludedTags, setIncludedSentiments, setIncludedEmotions,
        setExcludedTags, setExcludedSentiments, setExcludedEmotions,
        setTextSubstr, setAnalyzed, setCreatedFrom, setModifiedFrom, setCreatedTo, setModifiedTo
    ]);

    const handleClassSelect = (type, name, action) => {
        if (type === 'sentiment') {
            if (action === 'include') {
                setIncludedSentiments(prev =>
                    prev.includes(name)
                        ? prev.filter(item => item !== name)
                        : [...prev, name]
                );
                setExcludedSentiments(prev =>
                    prev.filter(item => item !== name)
                );
            } else {
                setExcludedSentiments(prev =>
                    prev.includes(name)
                        ? prev.filter(item => item !== name)
                        : [...prev, name]
                );
                setIncludedSentiments(prev =>
                    prev.filter(item => item !== name)
                );
            }
        } else {
            if (action === 'include') {
                setIncludedEmotions(prev =>
                    prev.includes(name)
                        ? prev.filter(item => item !== name)
                        : [...prev, name]
                );
                setExcludedEmotions(prev =>
                    prev.filter(item => item !== name)
                );
            } else {
                setExcludedEmotions(prev =>
                    prev.includes(name)
                        ? prev.filter(item => item !== name)
                        : [...prev, name]
                );
                setIncludedEmotions(prev =>
                    prev.filter(item => item !== name)
                );
            }
        }
    };

    const renderSelectItem = (item, type) => {
        const isIncluded = (type === 'sentiment' ? includedSentiments : includedEmotions).includes(item.name);
        const isExcluded = (type === 'sentiment' ? excludedSentiments : excludedEmotions).includes(item.name);

        return <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '4px',
            width: '100%',
            px: 1
        }}>
            <Chip
                label={item.desc}
                size="small"
                sx={{
                    backgroundColor: item.color,
                    color: 'white',
                    flexGrow: 1,
                    mr: 1
                }}
            />
            <Box sx={{ display: 'flex' }}>
                <Checkbox
                    icon={<CheckIcon />}
                    checkedIcon={<CheckIcon />}
                    checked={isIncluded}
                    onChange={() => handleClassSelect(type, item.name, 'include')}
                    className={`class-select-cb cb-include ${isIncluded ? 'class-checked' : ''}`}
                    sx={{ p: 0.5 }}
                />
                <Checkbox
                    icon={<CloseIcon />}
                    checkedIcon={<CloseIcon />}
                    checked={isExcluded}
                    onChange={() => handleClassSelect(type, item.name, 'exclude')}
                    className={`class-select-cb cb-exclude ${isExcluded ? 'class-checked' : ''}`}
                    sx={{ p: 0.5 }}
                />
            </Box>
        </Box>;
    };

    const handleFilterDialogClose = useCallback(() => {
        setIsFilterDialogOpen(false);
    }, []);

    const handleFilterApplying = useCallback(async () => {
        if (isFilterApplying) { return; }
        setIsFilterApplying(true);
        try {
            const comments = await getCommentsByFilters();
            setAllComments([...comments]);
            if (comments?.length === 0) {
                notification(
                    'Комментарии не найдены! Попробуйте изменить параметры фильтрации.',
                    null, { severity: 'warning' }
                );
            } else {
                defaultSuccessNotification('Фильтры применены!');
            }
            const commentIdSet = new Set(comments.map(c => c.id));
            setSelected(prev => prev.filter(id => commentIdSet.has(id)));
            handleFilterDialogClose();
        } catch (err) {
            // todo: handle 401 everywhere
            defaultErrorNotification(mapErrorAfterReq(err), 'Ошибка загрузки комментариев');
        } finally {
            setIsFilterApplying(false);
        }
    }, [
        getCommentsByFilters, handleFilterDialogClose, isFilterApplying,
        notification, defaultSuccessNotification, defaultErrorNotification
    ]);

    const handleAddComment = useCallback(async commentText => {
        const response = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}/api/comment/save`,
            {
                comment: {
                    id: null,
                    text: commentText.trim(),
                    sentiment: null,
                    emotion: null,
                    analyzed: false
                }
            },
            { withCredentials: true }
        );
        setAllComments(prev => [response.data.comment, ...prev]);
    }, []);

    const handleAnalyze = useCallback(async ids => {
        if (ids.length === 0) {
            notification('Вы не выбрали ни одного комментария для анализа', null, { severity: 'warning' });
            return;
        }
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}/api/ai/analyze`,
                { ids: ids },
                { withCredentials: true }
            );
            const analyzedComments = response.data;
            setAllComments(comments => {
                const newComments = [...comments];
                const amount = newComments.length;
                for (let i = 0; i < amount; i++) {
                    if (newComments[i].id in analyzedComments) {
                        newComments[i] = analyzedComments[newComments[i].id];
                    }
                }
                return newComments;
            });
            const amount = Object.keys(analyzedComments).length ?? 0;
            defaultSuccessNotification(`Комментарии проанализированы успешно! ${amount ? (' Количество: ' + amount) : ''}`);
        } catch (err) {
            defaultErrorNotification(mapErrorAfterReq(err), 'Ошибка анализа комментариев');
        }
    }, [notification, defaultSuccessNotification, defaultErrorNotification]);

    const tagsAsObject = useMemo(() => {
        const tagsObj = {};
        allTags.forEach(tag => {
            tagsObj[tag.id] = tag;
        });
        return tagsObj;
    }, [allTags]);

    const handleTagIncludeSwitch = useCallback(event => {
        setIncludeTagsSwitch(event.target.value === 'true');
    }, []);

    const handleTagClick = useCallback(tag => {
        const [tagList, setTagList] = (
            includeTagsSwitch ? [includedTags, setIncludedTags] : [excludedTags, setExcludedTags]
        );
        if (!tagList.some(t => t.id === tag.id)) {
            setTagList(prev => [...prev, tag]);
        }
    }, [includeTagsSwitch, includedTags, excludedTags, setIncludedTags, setExcludedTags]);

    const handleTagEdit = useCallback(tag => {
        setEditedTag({ ...tag, mode: 'edit' });
    }, []);

    const onTagEdit = useCallback(async () => {
        if (!editedTag) return;
        if (editedTag.mode === 'new') {
            try {
                const response = await axios.post(
                    `${process.env.REACT_APP_BACKEND_URL}/api/tag/save`,
                    {
                        tag: {
                            name: editedTag.name,
                            color: editedTag.color,
                            parentId: null,
                        }
                    },
                    { withCredentials: true }
                );
                const newTag = response.data.tag;
                setAllTags(prev => [...prev, newTag]);
                defaultSuccessNotification(`Тег "${newTag.name}" успешно создан!`);
                setEditedTag({ mode: null, name: '' });
            } catch (err) {
                defaultErrorNotification(mapErrorAfterReq(err), 'Ошибка создания тега');
            }
        } else if (editedTag.mode === 'edit') {
            try {
                const nc = editedTag.newChildren;
                const deletedChildren = nc
                    .filter(t => !uuidRegex.test(t.id) && t.deleted)
                    .map(t => t.id);
                const newChildren = nc
                    .filter(t => uuidRegex.test(t.id) && !t.deleted)
                    .map(t => ({ ...t, id: undefined, deleted: undefined }));
                const tagInfo = {
                    id: editedTag.id,
                    name: editedTag.name,
                    color: editedTag.color,
                    parentId: editedTag.parentId,
                    newChildren: newChildren,
                    deletedChildren: deletedChildren
                };
                await axios.put(
                    `${process.env.REACT_APP_BACKEND_URL}/api/tag/update`,
                    { tag: tagInfo },
                    { withCredentials: true }
                );
                defaultSuccessNotification(`Тег успешно изменён!`);
                loadTags();
                setEditedTag({ mode: null, name: '' });
            } catch (err) {
                defaultErrorNotification(mapErrorAfterReq(err), 'Ошибка редактирования тега');
            }
        }
    }, [editedTag, loadTags, defaultSuccessNotification, defaultErrorNotification]);

    const deleteTags = useCallback(async ids => {
        try {
            await axios.put(
                `${process.env.REACT_APP_BACKEND_URL}/api/tag/delete`,
                { ids: ids },
                { withCredentials: true }
            );
            if (ids.length === 1) {
                const deleted = allTags.find(tag => tag.id === ids[0]);
                defaultSuccessNotification(`Тег${deleted ? (' «' + deleted.name + '»') : ''} успешно удалён!`);
            } else {
                defaultSuccessNotification(`Теги (${ids.length} шт.) успешно удалены!`);
            }
            setAllTags(prev => prev.filter(tag => !ids.includes(tag.id)));
            setEditedTag({ mode: null, name: '' });
        } catch (err) {
            defaultErrorNotification(mapErrorAfterReq(err), `Ошибка удаления тег${ids.length === 1 ? 'а' : 'ов'}`);
        }
    }, [allTags, setAllTags, setEditedTag, defaultSuccessNotification, defaultErrorNotification]);

    const editComments = useCallback(async updates => {
        const response = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}/api/comment/updateAll`,
            updates,
            { withCredentials: true }
        );
        const newCommentsObj = {};
        const newComments = response.data.comments ?? [];
        newComments.forEach(comment => { newCommentsObj[comment.id] = comment; });
        setAllComments(prev => prev.map(comment => newCommentsObj[comment.id] ?? comment));
    }, []);

    const deleteComments = useCallback(async ids => {
        await axios.put(
            `${process.env.REACT_APP_BACKEND_URL}/api/comment/delete`,
            { ids: ids },
            { withCredentials: true }
        );
        setAllComments(prev => prev.filter(comment => !ids.includes(comment.id)));
    }, []);

    const handleTextChange = useCallback(e => {
        setTextSubstr(e.target.value);
    }, []);

    const downloadComments = useCallback(async type => {
        // todo different types
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}/api/comment/export/${type}`,
                { commentIds: selected },
                {
                    withCredentials: true,
                    responseType: 'blob'
                }
            );

            const contentDisposition = response.headers['content-disposition'];
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                : `comments.${type}`;

            // Создаем и триггерим скачивание
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            defaultErrorNotification(mapErrorAfterReq(err), `Ошибка загрузки ${type.toUpperCase()}-файла`);
        }
    }, [selected, defaultErrorNotification]);

    const classSelectStyle = {
        '& .MuiInputLabel-root': {
            backgroundColor: 'background.paper',
            px: 0.5,
            transform: 'translate(14px, -9px) scale(0.75)',
            '&.Mui-focused': {
                color: 'primary.main',
            }
        }
    };

    return <>
        <Box
            sx={{
                background: '#444444',
                width: '100%',
                height: '64px',
                padding: '16px',
                boxSizing: 'border-box'
            }}
        >
            <Button variant='contained' size='small' onClick={handleLogout}>Выйти из профиля</Button>
        </Box>
        <Box
            sx={{
                height: 'calc(100vh - 64px)',
                maxHeight: 'calc(100vh - 64px)',
                overflow: 'hidden'
            }}
        >
            <Stack direction="row" sx={{ width: '100%', display: 'flex' }}>
                <MemoizedTagTree
                    tags={allTags}
                    onTagClick={handleTagClick}
                    onTagEdit={handleTagEdit}
                    maxHeight={'90vh'}
                    flex={0.2}
                    createBtn={<Chip
                        key={'new-tag-chip-btn'}
                        icon={<Add color='white' />}
                        label='Новый тег'
                        onClick={() => setEditedTag(prev => {
                            const newTag = { ...prev };
                            if (newTag.mode === 'edit') {
                                newTag.name = '';
                            }
                            newTag.mode = 'new';
                            return newTag;
                        })}
                        size='small'
                        sx={{
                            px: '3px', py: '15px', mb: '3px', ml: '4px',
                            color: 'white',
                            bgcolor: '#0000bb',
                            '&:hover': {
                                bgcolor: '#0000ee',
                            }
                        }}
                    />}
                />
                <Stack
                    direction="column"
                    sx={{
                        flex: 1,
                        display: 'flex',
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            height: '120px',
                            marginInline: 2,
                            marginTop: 1,
                            p: 2
                        }}
                    >
                        <Button
                            variant="outlined"
                            onClick={() => setIsFilterDialogOpen(true)}
                            startIcon={<FilterAlt />}
                        >
                            Фильтры
                        </Button>
                        <Button
                            color="success"
                            variant="outlined"
                            onClick={() => downloadComments('json')}
                            startIcon={<Download />}
                            sx={{ mx: 2 }}
                        >
                            Скачать
                        </Button>
                    </Paper>
                    <MemoizedCommentList
                        comments={allComments}
                        tags={tagsAsObject}
                        tagList={allTags}
                        onAddComment={handleAddComment}
                        onEditComments={editComments}
                        onDeleteComments={deleteComments}
                        onAnalyze={handleAnalyze}
                        selected={selected}
                        setSelected={setSelected}
                        errMapper={mapErrorAfterReq}
                    />
                </Stack>
            </Stack>
        </Box >

        <Dialog
            open={isFilterDialogOpen}
            onClose={handleFilterDialogClose}
            scroll='paper'
            maxWidth={'90vw'}
        >
            <DialogTitle align="center">Поиск комментариев</DialogTitle>
            <DialogContent>
                <Stack direction="row" spacing={2} style={{ display: 'flex' }}>
                    <MemoizedTagTree
                        tags={allTags}
                        onTagClick={handleTagClick}
                        onTagEdit={null}
                        maxHeight={'60vh'}
                        flex={0.25}
                        createBtn={<React.Fragment key={'tag-tree-empty-btn'} />}
                    />
                    <Stack direction="column" spacing={2} flex={1}>
                        <RadioGroup
                            name="tag-include-exclude"
                            value={includeTagsSwitch}
                            onChange={handleTagIncludeSwitch}
                        >
                            {[
                                { formValue: true, formLabel: 'Включить:', tagList: includedTags, setTagList: setIncludedTags },
                                { formValue: false, formLabel: 'Исключить:', tagList: excludedTags, setTagList: setExcludedTags },
                            ].map(row => (
                                <Stack
                                    direction="row"
                                    sx={{
                                        width: '50vw',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    key={row.formLabel}
                                >
                                    <FormControlLabel value={row.formValue} label={row.formLabel} control={<Radio />} />
                                    <Stack direction="row" flexWrap="wrap" spacing={0.5}>
                                        {row.tagList.map(tag => renderTag(tag, row.setTagList))}
                                    </Stack>
                                </Stack>
                            ))}
                        </RadioGroup>

                        <TextField
                            label="Поиск по тексту комментария"
                            variant="outlined"
                            value={textSubstr}
                            onChange={handleTextChange}
                            fullWidth
                            margin="normal"
                        />

                        <Stack direction="row" spacing={1}>
                            <FormControl
                                sx={{
                                    border: '1px solid rgba(0, 0, 0, 0.2)',
                                    borderRadius: '4px',
                                    p: 1.5, pt: 1, pb: 0.5
                                }}
                            >
                                <FormLabel id="filter-analyzed">Искать комментарии, которые:</FormLabel>
                                <RadioGroup row
                                    aria-labelledby="filter-analyzed"
                                    value={analyzed}
                                    onChange={e => setAnalyzed(e.target.value)}
                                >
                                    <FormControlLabel value={'true'} control={<Radio />} label="Прошли анализ" />
                                    <FormControlLabel value={'false'} control={<Radio />} label="Не прошли анализ" />
                                    <FormControlLabel value={'null'} control={<Radio />} label="Не важно" />
                                </RadioGroup>
                            </FormControl>
                            <FormControl
                                sx={{
                                    width: '250px',
                                    marginTop: '16px !important',
                                    ...classSelectStyle
                                }}
                            >
                                <InputLabel id="sentiments-label" shrink>Настроения</InputLabel>
                                <Select
                                    labelId="sentiments-label"
                                    label="Настроения"
                                    multiple
                                    value={[]}
                                    displayEmpty
                                    sx={{ '& .MuiSelect-select': { pt: 2, pl: 1.5 } }}
                                >
                                    {sentiments.map(item => (
                                        <MenuItem key={item.name} dense>
                                            {renderSelectItem(item, 'sentiment')}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl
                                sx={{
                                    width: '250px',
                                    marginTop: '16px !important',
                                    ...classSelectStyle
                                }}
                            >
                                <InputLabel id="emotionts-label" shrink>Эмоции</InputLabel>
                                <Select
                                    labelId="emotionts-label"
                                    label="Эмоции"
                                    multiple
                                    value={[]}
                                    displayEmpty
                                    sx={{ '& .MuiSelect-select': { pt: 2, pl: 1.5 } }}
                                >
                                    {emotions.map(item => (
                                        <MenuItem key={item.name} dense>
                                            {renderSelectItem(item, 'emotion')}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>

                        <LocalizationProvider
                            dateAdapter={AdapterDayjs}
                            adapterLocale="ru"
                            localeText={localeText}
                        >
                            <Typography variant="h6">Дата создания</Typography>
                            <Box>
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    sx={{
                                        display: 'flex',
                                        width: '100%',
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    <DateTimePicker
                                        key={createdFrom ? 'filled-start' : 'empty-start'}
                                        label="Начальная дата"
                                        value={createdFrom}
                                        onChange={newValue => setCreatedFrom(newValue)}
                                        maxDateTime={createdTo}
                                        format={dateTimeFormat}
                                        ampm={false}
                                        views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
                                        slotProps={{
                                            textField: { fullWidth: true },
                                            actionBar: {
                                                actions: ['accept', 'cancel', 'today', 'clear'],
                                            },
                                        }}
                                        sx={{ flex: 1, minWidth: 200 }}
                                    />
                                    <DateTimePicker
                                        key={createdTo ? 'filled-end' : 'empty-end'}
                                        label="Конечная дата"
                                        value={createdTo}
                                        onChange={newValue => setCreatedTo(newValue)}
                                        minDateTime={createdFrom}
                                        format={dateTimeFormat}
                                        ampm={false}
                                        views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
                                        slotProps={{
                                            textField: { fullWidth: true },
                                            actionBar: {
                                                actions: ['accept', 'cancel', 'today', 'clear'],
                                            },
                                        }}
                                        sx={{ flex: 1, minWidth: 200 }}
                                    />
                                </Stack>
                            </Box>
                            <Typography variant="h6">Дата изменения</Typography>
                            <Box>
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    sx={{
                                        display: 'flex',
                                        width: '100%',
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    <DateTimePicker
                                        key={modifiedFrom ? 'filled-m-start' : 'empty-m-start'}
                                        label="Начальная дата"
                                        value={modifiedFrom}
                                        onChange={newValue => setModifiedFrom(newValue)}
                                        maxDateTime={modifiedTo}
                                        format={dateTimeFormat}
                                        ampm={false}
                                        views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
                                        slotProps={{
                                            textField: { fullWidth: true },
                                            actionBar: {
                                                actions: ['accept', 'cancel', 'today', 'clear'],
                                            },
                                        }}
                                        sx={{ flex: 1, minWidth: 200 }}
                                    />
                                    <DateTimePicker
                                        key={modifiedTo ? 'filled-m-end' : 'empty-m-end'}
                                        label="Конечная дата"
                                        value={modifiedTo}
                                        onChange={newValue => setModifiedTo(newValue)}
                                        minDateTime={modifiedFrom}
                                        format={dateTimeFormat}
                                        ampm={false}
                                        views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
                                        slotProps={{
                                            textField: { fullWidth: true },
                                            actionBar: {
                                                actions: ['accept', 'cancel', 'today', 'clear'],
                                            },
                                        }}
                                        sx={{ flex: 1, minWidth: 200 }}
                                    />
                                </Stack>
                            </Box>
                        </LocalizationProvider>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', marginInline: '20px', marginBottom: '10px' }}>
                <Button
                    variant="outlined"
                    color="error"
                    onClick={resetFilters}
                >
                    Сбросить фильтры
                </Button>
                <Box>
                    <Button
                        variant="outlined"
                        onClick={handleFilterDialogClose}
                        sx={{ marginInline: '30px' }}
                    >
                        Отмена
                    </Button>
                    <Button
                        variant="contained"
                        disabled={isFilterApplying}
                        onClick={handleFilterApplying}
                        startIcon={<Search />}
                    >
                        {isFilterApplying ? <CircularProgress size={24} /> : 'Применить'}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
        <EditTag
            tagTree={tagsAsObject}
            tagList={allTags}
            tag={editedTag}
            setTag={setEditedTag}
            onTagEdit={onTagEdit}
            onTagsDelete={deleteTags}
        />
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

export default HomePage;
