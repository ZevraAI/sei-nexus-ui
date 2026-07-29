import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { Showcase } from './ds/Showcase.tsx';
import './styles.css';
import './ds/tokens.css'; // Zevra Design Language v1.0 — production token layer

// Dev gate: open the Zevra Design Language foundation at "?showcase".
// Reversible — the normal app renders for every other URL.
const params = new URLSearchParams(window.location.search);
const showFoundation = params.has('showcase') || window.location.hash === '#showcase';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {showFoundation ? <Showcase /> : <App />}
  </React.StrictMode>
);
