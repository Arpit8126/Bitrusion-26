import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { analytics, logEvent } from "./lib/firebase";

// Global click tracking for Firebase Analytics
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (!analytics) return;
    
    // Attempt to track meaningful elements rather than raw SVG/paths
    let el = e.target;
    while (el && el !== document.body && !el.id && !el.className && el.tagName !== 'BUTTON' && el.tagName !== 'A') {
      el = el.parentElement;
    }
    el = el || e.target;

    const eventName = 'user_click';
    const params = {
      element_tag: el.tagName || 'UNKNOWN',
      element_id: el.id || 'none',
      element_class: typeof el.className === 'string' ? el.className.substring(0, 50) : 'none',
      element_text: (el.innerText || el.value || '').substring(0, 50).trim() || 'none',
    };
    
    logEvent(analytics, eventName, params);
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
