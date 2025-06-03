import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import WelcomePage from './pages/WelcomePage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StatsDashboard from './components/StatsDashboard';
import StatsProvider from './contexts/StatsProvider';
import StatPage from './pages/StatPage';

function Application() {
    return (
        <div className="app">
            <Routes>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/home" element={
                    <PrivateRoute>
                        <HomePage />
                    </PrivateRoute>
                } />
                <Route path="/dashboard" element={
                    <PrivateRoute>
                        <StatsDashboard />
                    </PrivateRoute>
                } />
                <Route path="/stat/dashboard" element={
                    <PrivateRoute>
                        <StatsProvider>
                            <StatPage />
                        </StatsProvider>
                    </PrivateRoute>
                } />
            </Routes>
        </div>
    );
}

export default Application;