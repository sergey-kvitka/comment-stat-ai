import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import CommentList from '../components/CommentList';
import TagTree from '../components/TagTree';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress, Stack, RadioGroup, FormControlLabel, Radio,
    Chip
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

    const [includeTags, setIncludeTags] = useState(true);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
    const [isFilterApplying, setIsFilterApplying] = useState(false);

    const navigate = useNavigate();

    const loadTags = async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}/api/tag/all`,
                { withCredentials: true }
            );
            // todo: setAllTags(response.data.tags);
            // todo for test many tags
            setAllTags([
                ...response.data.tags,
                ...(response.data.tags.map(t => ({
                    ...t,
                    id: +t.id * 10,
                    name: '~ ' + t.name,
                    color: 'dodgerblue'
                })))
            ]);
        } catch (e) {
            console.error(e.response?.status);
            console.error(e);
        }
    }

    const loadComments = async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}/api/comment/all`,
                { withCredentials: true }
            );
            setAllComments(response.data.comments);
        } catch (e) {
            console.error(e.response?.status);
            console.error(e);
        }
    };

    const loadCommentByFilters = async () => {
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}/api/comment/getByFilters`,
                {
                    textSubstr: textSubstr,
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
            setAllComments(response.data.comments);
        } catch (e) {
            console.error(e.response?.status);
            console.error(e);
        }
    }

    useEffect(() => {
        loadComments();
        loadTags();
    }, []);

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
        // check if any of filters is valid
        if (
            !([includedTags, includedSentiments, includedEmotions,
                excludedTags, excludedSentiments, excludedEmotions].some(arr => !!(arr?.length))
                || textSubstr
                || analyzed !== null
                || (createdFrom && createdTo)
                || (modifiedFrom && modifiedTo)
            )
        ) {
            console.warn('Filters are empty, nothing to apply');
            return;
        }
        // todo get response & close dialog
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
        setIncludeTags(event.target.value === 'true');
    }

    const handleTagClick = tag => {
        const [tagList, setTagList] = (
            includeTags ? [includedTags, setIncludedTags] : [excludedTags, setExcludedTags]
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
        <button onClick={loadCommentByFilters}>Применить фильтры</button>
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
                            value={includeTags}
                            onChange={handleTagIncludeSwitch}
                        >
                            <Stack direction="row" sx={{ width: '50vw' }}>
                                <FormControlLabel
                                    value={true}
                                    control={<Radio />}
                                    label="Включить:"
                                />
                                <Stack direction="row" flexWrap="wrap" spacing={0.5}>
                                    {includedTags.map(tag => (
                                        <Chip
                                            key={tag.id}
                                            label={tag.name}
                                            size="small"
                                            sx={{
                                                backgroundColor: tag.color,
                                                marginBottom: '5px !important',
                                                color: 'white',
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Stack>
                            <Stack direction="row" sx={{ width: '50vw' }}>
                                <FormControlLabel
                                    value={false}
                                    control={<Radio />}
                                    label="Исключить:"
                                />
                                <Stack direction="row" flexWrap="wrap" spacing={0.5}>
                                    {excludedTags.map(tag => (
                                        <Chip
                                            key={tag.id}
                                            label={tag.name}
                                            size="small"
                                            sx={{
                                                backgroundColor: tag.color,
                                                marginBottom: '5px !important',
                                                color: 'white',
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Stack>
                        </RadioGroup>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleFilterDialogClose}>Отмена</Button>
                <Button
                    onClick={handleFilterApplying}
                    variant="contained"
                >
                    {isFilterApplying ? <CircularProgress size={24} /> : 'Применить'}
                </Button>
            </DialogActions>
        </Dialog>
    </div>;
};

export default HomePage;
