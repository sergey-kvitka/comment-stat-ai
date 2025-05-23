import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { useEffect, useState } from 'react';

const PrivateRoute = ({ children }) => {
    const [isAuth, setIsAuth] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                await axios.get(
                    `${process.env.REACT_APP_BACKEND_URL}/api/auth/check`,
                    { withCredentials: true }
                );
                setIsAuth(true);
            } catch (e) {
                setIsAuth(false);
            }
        };
        checkAuth();
    }, []);

    if (isAuth === null) return <></>; // todo spinner
    return isAuth ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;