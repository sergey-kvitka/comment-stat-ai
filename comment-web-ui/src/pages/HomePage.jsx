import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import CommentList from '../components/CommentList';
import TagTree from '../components/TagTree';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress,
    Stack, RadioGroup, FormControlLabel, Radio, Chip, TextField, FormControl, FormLabel,
} from '@mui/material';

const MemoizedTagTree = React.memo(TagTree);
const MemoizedCommentList = React.memo(CommentList);

const HomePage = () => {

    const [allTags, setAllTags] = useState([]);
    const [allComments, setAllComments] = useState([]);

    // todo emotion and sentiment lists being loaded from server

    // comment filters
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

    const navigate = useNavigate();

    useEffect(() => {
        loadComments();
        loadTags();
    }, []);

    const removeTagFromList = useCallback((id, setNewList) => {
        setNewList(prev => [...prev.filter(tag => tag.id !== id)]);
    }, []);

    const renderTag = useCallback((tag, setTagList) => (
        <Chip
            key={tag.id}
            label={tag.name}
            size="small"
            onClick={() => removeTagFromList(tag.id, setTagList)}
            sx={{
                backgroundColor: tag.color,
                marginBottom: '5px !important',
                color: 'white',
            }}
        />
    ), [removeTagFromList]);

    const loadTags = useCallback(async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}/api/tag/all`,
                { withCredentials: true }
            );
            setAllTags(response.data.tags);
        } catch (err) {
            console.error(err.response?.status);
            console.error(err);
        }
    }, []);

    const loadComments = useCallback(async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}/api/comment/all`,
                { withCredentials: true }
            );
            setAllComments(response.data.comments);
        } catch (err) {
            console.error(err.response?.status);
            console.error(err);
        }
    }, []);

    const getCommentsByFilters = useCallback(async () => {
        const response = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}/api/comment/getByFilters`,
            {
                textSubstr: textSubstr.trim() ?? null,
                analyzed: (analyzed === 'null') ? null : Boolean(analyzed),
                created: { from: createdFrom, to: createdTo, },
                modified: { from: modifiedFrom, to: modifiedTo, },
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
        return response.data.comments;
    }, [
        textSubstr, analyzed, createdFrom, createdTo, modifiedFrom, modifiedTo,
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
        setCreatedFrom(null);
        setModifiedFrom(null);
        setCreatedTo(null);
        setModifiedTo(null);
    }, []);

    const handleFilterDialogClose = useCallback(() => {
        setIsFilterDialogOpen(false);
    }, []);

    const handleFilterApplying = useCallback(async () => {
        if (isFilterApplying) return;
        if (!(analyzed !== 'null'
            || textSubstr
            || (createdFrom && createdTo)
            || (modifiedFrom && modifiedTo)
            || [
                includedTags, includedSentiments, includedEmotions,
                excludedTags, excludedSentiments, excludedEmotions
            ].some(
                arr => Boolean(arr?.length)
            )
        )) {
            alert('Filters are empty, nothing to apply');
            return;
        }
        setIsFilterApplying(true);
        try {
            const comments = await getCommentsByFilters();
            setAllComments([...comments]);
            handleFilterDialogClose();
        } catch (err) {
            // todo: change alerts everywhere
            // todo: handle 401 everywhere
            if (err.response) {
                alert(err.response.data?.message ?? `${err.response.status} HTTP error`);
            } else {
                alert(err.message);
            }
        } finally {
            setIsFilterApplying(false);
        }
    }, [
        textSubstr, analyzed, createdFrom, createdTo, modifiedFrom, modifiedTo,
        excludedEmotions, excludedSentiments, excludedTags, includedEmotions, includedSentiments, includedTags,
        getCommentsByFilters, handleFilterDialogClose, isFilterApplying
    ]);

    const handleAddComment = useCallback(async commentText => {
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}/api/comment/save`,
                {
                    comment: {
                        id: null,
                        text: commentText,
                        sentiment: null,
                        emotion: null,
                        analyzed: false
                    }
                },
                { withCredentials: true }
            );
            setAllComments(prev => [response.data.comment, ...prev]);
        } catch (err) {
            alert(err.response?.data?.message || 'An error occurred');
        }
    }, []);

    const handleAnalyze = useCallback(async ids => {
        if (ids.length === 0) {
            alert('Вы не выбрали ни одного комментария для анализа');
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
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'An error occurred');
        }
    }, []);

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
    }, [excludedTags, includeTagsSwitch, includedTags]);

    const handleTagEdit = useCallback(tag => {
        console.log('editing tag: ' + JSON.stringify(tag));
    }, []);

    const handleTextChange = useCallback((e) => {
        setTextSubstr(e.target.value);
    }, []);

    return <div className="home-page">
        <button onClick={handleLogout}>Выйти из профиля</button>
        <button onClick={handleFilterApplying}>Применить фильтры</button>
        <button onClick={() => setIsFilterDialogOpen(true)}>Фильтры</button>

        <MemoizedCommentList
            comments={allComments}
            tags={tagsAsObject}
            onAddComment={handleAddComment}
            onAnalyze={handleAnalyze}
        />

        <MemoizedTagTree
            tags={allTags}
            onTagClick={handleTagClick}
            onTagEdit={handleTagEdit}
        />

        <Dialog
            open={isFilterDialogOpen}
            onClose={handleFilterDialogClose}
            scroll='paper'
            maxWidth={'90vw'}
        >
            <DialogTitle align="center">Поиск комментариев</DialogTitle>
            <DialogContent>
                <Stack direction="row" spacing={2}>
                    <MemoizedTagTree
                        tags={allTags}
                        onTagClick={handleTagClick}
                        onTagEdit={null}
                    />
                    <Stack direction="column">
                        <RadioGroup
                            name="tag-include-exclude"
                            value={includeTagsSwitch}
                            onChange={handleTagIncludeSwitch}
                        >
                            {[
                                { formValue: true, formLabel: 'Включить:', tagList: includedTags, setTagList: setIncludedTags },
                                { formValue: false, formLabel: 'Исключить:', tagList: excludedTags, setTagList: setExcludedTags },
                            ].map(row => (
                                <Stack direction="row" sx={{ width: '50vw' }} key={row.formLabel}>
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

                        <FormControl>
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
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleFilterDialogClose}>Отмена</Button>
                <Button
                    onClick={() => handleFilterApplying(textSubstr)}
                    variant="contained"
                >
                    {isFilterApplying ? <CircularProgress size={24} /> : 'Применить'}
                </Button>
            </DialogActions>
        </Dialog>
    </div>;
};

export default HomePage;
