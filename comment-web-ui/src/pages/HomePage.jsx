import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';

const HomePage = () => {
    const [comment, setComment] = useState('');
    const [emotion, setEmotion] = useState('');
    const [sentiment, setSentiment] = useState('');

    const navigate = useNavigate();

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
    </div>;
};

export default HomePage;