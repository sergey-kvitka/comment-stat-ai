import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthForm = ({ type }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async e => {
        e.preventDefault();
        setError("");

        try {
            const url = `${process.env.BACKEND_URL}/api/auth/${type === 'login' ? 'login' : 'register'}`;
            const data = type === 'login'
                ? { email, password }
                : { email, password, username };

            const response = await axios.post(url, data, { withCredentials: true });
            if (response.status === 200 || response.status === 201) {
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        }
    };

    return <div className="auth-form">
        <h2>{type === 'login' ? 'Login' : 'Register'}</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
            {type === 'register' && (
                <div>
                    <label>Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
            )}
            <div>
                <label>Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
            </div>
            <button type="submit">
                {type === 'login' ? 'Login' : 'Register'}
            </button>
        </form>
        {type === 'login' ? (
            <p>Don't have an account? <a href="/register">Register</a></p>
        ) : (
            <p>Already have an account? <a href="/login">Login</a></p>
        )}
    </div>;
};

export default AuthForm;