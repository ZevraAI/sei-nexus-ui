import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ds/tokens.css'; // Zevra Signature token layer (--z-* + Pulse Spine keyframes)
import './styles.css';
import { MockupShell } from './pages/mockup/MockupShell';
import { HomePageMockup } from './pages/mockup/HomePageMockup';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <MockupShell>
      <HomePageMockup />
    </MockupShell>
  </StrictMode>
);
