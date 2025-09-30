// Firebase initialization and exports
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCml0-POZPr8vgNzbVrKfyQV5mp2i5n2ag',
  authDomain: 'unt-website.firebaseapp.com',
  projectId: 'unt-website',
  storageBucket: 'unt-website.firebasestorage.app',
  messagingSenderId: '930427444263',
  appId: '1:930427444263:web:689ed7dc03bf850e0bc202',
  measurementId: 'G-9H0MS4Y7FM',
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(firebaseApp);

// Initialize Analytics only if supported (browser environments)
isAnalyticsSupported().then((supported) => {
  if (supported) {
    try {
      getAnalytics(firebaseApp);
    } catch (err) {
      // noop: analytics is optional
    }
  }
});

export default db;


