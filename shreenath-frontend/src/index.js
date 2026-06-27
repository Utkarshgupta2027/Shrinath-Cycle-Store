import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global/index.css';
import './utils/apiClient';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { syncThemeFromStorage } from './utils/theme';
import { initGA } from './utils/googleAnalytics';
import { startKeepAlive } from './utils/keepAlive';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Apply the saved theme immediately — before React mounts —
// so there's no flash of wrong theme on page load / refresh.
syncThemeFromStorage();

// Initialize Google Analytics 4 before React renders.
// Reads REACT_APP_GA_MEASUREMENT_ID from .env
initGA();

// Keep the Render backend alive by pinging it every 10 minutes.
// This prevents the free-tier server from spinning down due to inactivity.
startKeepAlive();


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register the PWA service worker (supports offline mode and installation prompt)
serviceWorkerRegistration.register();
