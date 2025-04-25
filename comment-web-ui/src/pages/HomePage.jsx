import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import CommentList from '../components/CommentList';
import TagTree from '../components/TagTree';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress, Stack, RadioGroup, FormControlLabel, Radio, Chip
} from '@mui/material';

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
    const [textSubstr, setTextSubstr] = useState();
    const [analyzed, setAnalyzed] = useState();
    const [createdFrom, setCreatedFrom] = useState();
    const [modifiedFrom, setModifiedFrom] = useState();
    const [createdTo, setCreatedTo] = useState();
    const [modifiedTo, setModifiedTo] = useState();

    const [includeTagsSwitch, setIncludeTagsSwitch] = useState(true);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
    const [isFilterApplying, setIsFilterApplying] = useState(false);
    const [validFilters, setValidFilters] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        loadComments();
        loadTags();
    }, []);

    useEffect(() => {
        setValidFilters(
            textSubstr
            || analyzed !== null
            || (createdFrom && createdTo)
            || (modifiedFrom && modifiedTo)
            || [
                includedTags, includedSentiments, includedEmotions,
                excludedTags, excludedSentiments, excludedEmotions
            ].some(
                arr => Boolean(arr?.length)
            )
        );
    }, [
        includedTags, includedSentiments, includedEmotions, excludedTags, excludedSentiments, excludedEmotions,
        textSubstr, analyzed, createdFrom, modifiedFrom, createdTo, modifiedTo
    ]);

    const removeTagFromList = (id, setNewList) => {
        setNewList(prev => [...prev.filter(tag => tag.id !== id)])
    };

    const loadTags = async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}/api/tag/all`,
                { withCredentials: true }
            );
            // todo for test many tags // setAllTags(response.data.tags);
            setAllTags([
                ...response.data.tags,
                ...(response.data.tags.map(t => ({
                    ...t,
                    id: +t.id * 10,
                    name: '~ ' + t.name,
                    color: 'dodgerblue'
                })))
            ]);
        } catch (err) {
            console.error(err.response?.status);
            console.error(err);
        }
    }

    const loadComments = async () => {
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
    };

    const getCommentsByFilters = async () => {
        const response = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}/api/comment/getByFilters`,
            {
                textSubstr: textSubstr.trim() ?? null,
                analyzed: analyzed,
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
    }

    const handleLogout = () => {
        // todo: logout endpoint
        navigate('/login');
    };

    const resetFilters = () => {
        setIncludedTags([]);
        setExcludedTags([]);
        setIncludedSentiments([]);
        setExcludedSentiments([]);
        setIncludedEmotions([]);
        setExcludedEmotions([]);
        setTextSubstr(null);
        setAnalyzed(null);
        setCreatedFrom(null);
        setModifiedFrom(null);
        setCreatedTo(null);
        setModifiedTo(null);
    }

    const handleFilterDialogClose = () => {
        setIsFilterDialogOpen(false);
        // resetFilters();
    };

    const handleFilterApplying = async () => {
        if (!validFilters) {
            console.warn('Filters are empty, nothing to apply');
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
    };

    const handleAddComment = async commentText => {
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
    };

    const handleAnalyze = async ids => {
        if (ids.length === 0) {
            return; // todo warning
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
    };

    const tagsAsObject = tags => {
        const tagsObj = {};
        tags.forEach(tag => {
            tagsObj[tag.id] = tag;
        })
        return tagsObj;
    };

    const handleTagIncludeSwitch = event => {
        setIncludeTagsSwitch(event.target.value === 'true');
    }

    const handleTagClick = tag => {
        const [tagList, setTagList] = (
            includeTagsSwitch ? [includedTags, setIncludedTags] : [excludedTags, setExcludedTags]
        );
        if (!tagList.some(t => t.id === tag.id)) {
            setTagList(prev => [...prev, tag]);
        }
    };

    useEffect(() => {
        console.table(includedTags);
    }, [includedTags]);

    const handleTagEdit = tag => {
        console.log('editing tag: ' + JSON.stringify(tag));
        // todo modal with tag editing
    };

    return <div className="home-page">
        <button onClick={handleLogout}>Выйти из профиля</button>
        <button onClick={handleFilterApplying}>Применить фильтры</button>
        <button onClick={() => setIsFilterDialogOpen(true)}>Фильтры</button>
        <CommentList
            comments={allComments}
            tags={tagsAsObject(allTags)}
            onAddComment={handleAddComment}
            onAnalyze={handleAnalyze}
        />
        <TagTree
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
                    <TagTree
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
                            ].map(row => <
                                Stack direction="row" sx={{ width: '50vw' }}
                            >
                                <FormControlLabel value={row.formValue} label={row.formLabel} control={<Radio />} />
                                <Stack direction="row" flexWrap="wrap" spacing={0.5}>
                                    {[...row.tagList].map(tag => (
                                        <Chip
                                            key={tag.id}
                                            label={tag.name}
                                            size="small"
                                            onClick={() => removeTagFromList(tag.id, row.setTagList)}
                                            sx={{
                                                backgroundColor: tag.color,
                                                marginBottom: '5px !important',
                                                color: 'white',
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Stack>)}
                        </RadioGroup>
                        <TextField
                            id="filter-text-substr"
                            label="Поиск по тексту комментария"
                            variant="outlined"
                            value={textSubstr}
                            onChange={e => setTextSubstr(e.target.value)}
                        />
                        <FormControl>
                            <FormLabel id="filter-analyzed">Искать комментарии, которые:</FormLabel>
                            <RadioGroup row
                                aria-labelledby="filter-analyzed"
                                value={analyzed}
                                onChange={e => setAnalyzed({ 'true': true, 'false': false, 'null': null, }[String(e.target.value)])}
                            >
                                <FormControlLabel value={true} control={<Radio />} label="Прошли анализ" />
                                <FormControlLabel value={false} control={<Radio />} label="Не прошли анализ" />
                                <FormControlLabel value={null} control={<Radio />} label="Не важно" />
                            </RadioGroup>
                        </FormControl>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleFilterDialogClose}>Отмена</Button>
                <Button
                    onClick={handleFilterApplying}
                    variant="contained"
                    disabled={!validFilters || isLoading}
                >
                    {isFilterApplying ? <CircularProgress size={24} /> : 'Применить'}
                </Button>
            </DialogActions>
        </Dialog>
    </div>;
};

export default HomePage;
