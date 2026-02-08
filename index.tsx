import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
const fallbackUi = document.getElementById('fallback-ui');
const errorMessage = document.getElementById('error-message');

function showFallback(err: unknown) {
  if (fallbackUi && errorMessage) {
    fallbackUi.style.display = 'block';
    errorMessage.innerText = err instanceof Error ? err.message : String(err);
    if (rootElement) rootElement.style.display = 'none';
  }
}

try {
  if (!rootElement) {
    throw new Error("Could not find root element with id 'root'");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  console.error("Mounting Error:", err);
  showFallback(err);
}

// Global error handler for uncaught exceptions
window.onerror = function(message, source, lineno, colno, error) {
  showFallback(error || message);
};
