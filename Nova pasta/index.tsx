import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (import.meta.env.DEV) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    registrations.forEach((registration) => {
      void registration.unregister();
    });
    return;
  }

  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.info('[PWA] Service worker registrado.');
  } catch (error) {
    console.warn('[PWA] Falha ao registrar service worker.', error);
  }
};

void registerServiceWorker();
