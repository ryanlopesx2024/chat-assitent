import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { debug, checkDOMState, checkEnvironment } from './debug';

debug('Application starting...');
checkEnvironment();

const init = () => {
  debug('Initializing application...');
  checkDOMState();

  const rootElement = document.getElementById('root');

  if (!rootElement) {
    console.error('Failed to find the root element');
    return;
  }

  try {
    debug('Creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    
    debug('Rendering application...');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    debug('Application rendered successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
  }
};

// Garante que o DOM está pronto antes de inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
