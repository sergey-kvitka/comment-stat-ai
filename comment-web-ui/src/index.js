import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Application from './Application';
import { NotificationProvider } from './contexts/NotificationContext';

import './styles/styles.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
    <BrowserRouter>
        <NotificationProvider>
            <Application />
        </NotificationProvider>
    </BrowserRouter>
);