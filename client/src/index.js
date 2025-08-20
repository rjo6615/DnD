import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import App from './App';
import reportWebVitals from './reportWebVitals';

const originalFetch = window.fetch;
window.fetch = (input, init = {}) => {
  const url = input instanceof Request ? input.url : input;
  const { origin } = new URL(url, window.location.href);
  const isSameOrigin = origin === window.location.origin;
  const options = isSameOrigin
    ? { credentials: 'include', ...init }
    : init;
  return originalFetch(input, options);
};

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
