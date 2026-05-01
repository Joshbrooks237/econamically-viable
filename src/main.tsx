import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import TrackPlayer from './TrackPlayer';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrackPlayer />
  </StrictMode>
);
