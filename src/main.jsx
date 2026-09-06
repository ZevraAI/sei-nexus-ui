import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './ds/tokens.css'; // Zevra Design Language token layer (base --z-*)
import './ds/intelligence/tokens.css'; // Intelligence Experience material layer (--z-ai-*)

const root = ReactDOM.createRoot(document.getElementById('root'));
const params = new URLSearchParams(window.location.search);
const wantsShowcase = params.has('showcase') || window.location.hash === '#showcase';
// TEMPORARY — visual verification harness for the Investigation Workspace redesign. Remove this
// branch and src/pages/__preview__/WorkspacePreview.jsx once verification is complete.
const wantsWorkspacePreview = params.has('preview') || window.location.hash === '#preview';

// Dev-only DS foundation harness ("?showcase"). The literal `import.meta.env.DEV` guard makes the
// bundler dead-code-eliminate the Showcase (and its representative sample content) from production.
if (import.meta.env.DEV && wantsShowcase) {
  import('./ds/Showcase.tsx').then(({ Showcase }) => {
    root.render(<React.StrictMode><Showcase /></React.StrictMode>);
  });
} else if (import.meta.env.DEV && wantsWorkspacePreview) {
  import('./pages/__preview__/WorkspacePreview.jsx').then(({ default: WorkspacePreview }) => {
    root.render(<React.StrictMode><WorkspacePreview /></React.StrictMode>);
  });
} else {
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
