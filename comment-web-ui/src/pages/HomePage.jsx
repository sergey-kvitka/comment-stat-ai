import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import CommentList from '../components/CommentList';
import TagTree from '../components/TagTree';

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

    const navigate = useNavigate();

    const loadTags = async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}/api/tag/all`,
                { withCredentials: true }
            );
            setAllTags(response.data.tags);
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
    }

    const tagsAsObject = tags => {
        const tagsObj = {};
        tags.forEach(tag => {
            tagsObj[tag.id] = tag;
        })
        return tagsObj;
    };

    const handleTagClick = tag => {
        // console.log('clicking tag: ' + JSON.stringify(tag));
        if (!includedTags.some(t => t.id === tag.id)) {
            setIncludedTags(prev => [...prev, tag]);
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
    </div>;
};

export default HomePage;
