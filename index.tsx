import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Aisle Be Back: Application Bootstrapping...");

const rootElement = document.getElementById('root');
const fallbackUi = document.getElementById('fallback-ui');
const errorMessage = document.getElementById('error-message');

function showFallback(err: unknown) {
  console.error("Critical Application Error:", err);
  if (fallbackUi && errorMessage) {
    fallbackUi.style.display = 'block';
    errorMessage.innerText = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    if (rootElement) rootElement.style.display = 'none';
  } else {
    // Basic alert if the fallback UI elements aren't found
    alert("Application failed to load. Check console for details.");
  }
}

try {
  if (!rootElement) {
    throw new Error("Target container 'root' not found in document.");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("Aisle Be Back: Render initiated successfully.");
} catch (err) {
  showFallback(err);
}

// Catch unhandled rejections as well
window.onunhandledrejection = (event) => {
  showFallback(event.reason);
};

// Catch global errors
window.onerror = (message, source, lineno, colno, error) => {
  showFallback(error || message);
  return true;
};
