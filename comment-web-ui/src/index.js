import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Application from './Application';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
    <BrowserRouter>
        <Application />
    </BrowserRouter>
);