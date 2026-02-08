import React from 'https://esm.sh/react@19.0.0';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Aisle Be Back: Initializing entry point...");

const rootElement = document.getElementById('root');
const fallbackUi = document.getElementById('fallback-ui');
const errorMessage = document.getElementById('error-message');
const initialLoader = document.getElementById('initial-loader');

function showFallback(err: unknown) {
  console.error("Critical Boot Error:", err);
  if (fallbackUi && errorMessage) {
    fallbackUi.style.display = 'block';
    errorMessage.innerText = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err);
    if (rootElement) rootElement.style.display = 'none';
  } else {
    alert("Application failed to load completely. Check browser console for stack trace.");
  }
}

try {
  if (!rootElement) {
    throw new Error("Target container #root not found in document.");
  }

  const root = ReactDOM.createRoot(rootElement);
  
  // Render the App
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  console.log("Aisle Be Back: Root render call successful.");
} catch (err) {
  showFallback(err);
}

// Catch runtime errors that occur during the initial module evaluation
window.onunhandledrejection = (event) => {
  showFallback(event.reason);
};

window.onerror = (message, source, lineno, colno, error) => {
  showFallback(error || message);
  return true;
};
