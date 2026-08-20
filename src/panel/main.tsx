import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './panel.css';

window.addEventListener('error', event => {
  console.error('[HireSeeker:panel] Ошибка окна:', event.error || event.message);
});

window.addEventListener('unhandledrejection', event => {
  console.error('[HireSeeker:panel] Необработанное исключение:', event.reason);
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
