import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

const HomePage = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        Cookies.remove('token');
        navigate('/login');
    };

    return (
        <div className="home-page">
            <h1>Hello World</h1>
            <p>Welcome to the protected page!</p>
            <button onClick={handleLogout}>Logout</button>
        </div>
    );
};

export default HomePage;