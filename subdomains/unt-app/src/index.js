import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './APP';
import { AppProvider } from './contexts/AppContext';
import db from './firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

// Log a Firestore document based on ?location=N when the site loads
async function logLocationFromQueryParam() {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const locationParam = searchParams.get('location');
    if (!locationParam) return;

    const locationNumber = Number(locationParam);
    const isValid = Number.isInteger(locationNumber) && locationNumber >= 1 && locationNumber <= 8;
    if (!isValid) return;

    const deviceType = (() => {
      try {
        const ua = navigator.userAgent || '';
        const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 1;
        const smallViewport = window.innerWidth <= 900;
        return (isMobileUA || (hasTouch && smallViewport)) ? 'Mobile' : 'Desktop';
      } catch {
        return 'Desktop';
      }
    })();

    const collectionName = `Location${locationNumber}`;
    await addDoc(collection(db, collectionName), {
      Timestamp: serverTimestamp(),
      Device: deviceType,
    });
  } catch (error) {
    // Silently ignore errors to avoid impacting UX
  }
}

// Fire-and-forget
logLocationFromQueryParam();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
