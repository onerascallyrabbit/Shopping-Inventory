import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const bootStatus = document.getElementById('boot-status');
const bootMessage = document.getElementById('boot-message');
const errorConsole = document.getElementById('error-console');
const errorText = document.getElementById('error-text');

function reportError(err: unknown) {
  console.error("BOOTSTRAP ERROR:", err);
  if (bootMessage) bootMessage.innerText = "Boot Failed";
  if (errorConsole) errorConsole.style.display = 'block';
  if (errorText) {
    errorText.innerText = err instanceof Error 
      ? `${err.name}: ${err.message}\n\nStack Trace:\n${err.stack}` 
      : String(err);
  }
}

try {
  console.log("Aisle Be Back: Attempting to mount React root...");
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error("Target container #root was not found in the DOM.");
  }

  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // Mark as bootstrapped for the index.html watchdog
  (window as any).__APP_BOOTSTRAPPED__ = true;

  // Hide the boot status overlay once React has had a chance to render
  requestAnimationFrame(() => {
    if (bootStatus) {
      bootStatus.classList.add('hidden');
    }
    console.log("Aisle Be Back: Application successfully mounted.");
  });

} catch (err) {
  reportError(err);
}

// Catch global errors during execution
window.onerror = (message, source, lineno, colno, error) => {
  reportError(error || message);
  return true;
};

window.onunhandledrejection = (event) => {
  reportError(event.reason);
};
