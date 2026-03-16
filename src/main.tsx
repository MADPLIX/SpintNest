import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { Splash } from './components/Splash'

const saved = localStorage.getItem('sprintnest_theme') as 'dark' | 'light' | null;
document.documentElement.setAttribute('data-theme', saved || 'dark');
const accent = localStorage.getItem('sprintnest_accent');
if (accent && /^#[0-9A-Fa-f]{6}$/.test(accent)) {
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  document.documentElement.style.setProperty('--color-accent', accent);
  document.documentElement.style.setProperty('--color-accent-hover', `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`);
  document.documentElement.style.setProperty('--color-accent-muted', `rgba(${r}, ${g}, ${b}, 0.15)`);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
    <App />
  </StrictMode>,
)
