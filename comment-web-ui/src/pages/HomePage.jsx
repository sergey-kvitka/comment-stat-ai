import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import CommentList from '../components/CommentList';

const HomePage = () => {
    const [comment, setComment] = useState('');
    const [emotion, setEmotion] = useState('');
    const [sentiment, setSentiment] = useState('');

    const [allComments, setAllComments] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
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
        loadComments();
    }, []);

    const handleLogout = () => {
        // todo: logout endpoint
        navigate('/login');
    };

    const sendToAnalyze = async () => {
        const text = (comment ?? '').trim();
        if (!text) {
            alert('Передан пустой комментарий!');
            return;
        }
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}/api/ai/analyze`,
                { comments: [text] },
                { withCredentials: true }
            );
            // alert(JSON.stringify(response.data));
            setEmotion(response.data[0].emotion);
            setSentiment(response.data[0].sentiment);
        } catch (err) {
            alert(err.response?.data?.message || 'An error occurred');
        }
    };

    return <div className="home-page">
        <button onClick={handleLogout}>Выйти из профиля</button>
        <br />
        <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder='Введите комментарий'
        />
        <br />
        <button onClick={sendToAnalyze}>Анализировать</button>
        <p>Эмоция: {emotion}</p>
        <p>Настроение: {sentiment}</p>
        <br />
        <br />
        <CommentList comments={allComments} />
    </div>;
};

export default HomePage;