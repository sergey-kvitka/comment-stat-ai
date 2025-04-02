import { useNavigate } from 'react-router-dom';

const WelcomePage = () => {
    const navigate = useNavigate();

    return <>
        <h1>Welcome to CommentStatAI!</h1>
        <button onClick={() => navigate('/login')}>Login</button>
    </>;
}

export default WelcomePage;