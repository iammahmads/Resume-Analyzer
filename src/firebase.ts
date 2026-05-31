import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSOo6m5C5SMYaDUOqLE1lpqE4qOW2xO5Q",
    authDomain: "ai-resume-9b068.firebaseapp.com",
    projectId: "ai-resume-9b068",
    storageBucket: "ai-resume-9b068.firebasestorage.app",
    messagingSenderId: "141324851582",
    appId: "1:141324851582:web:0a159a7b0ef01ec8b93b2f"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});
export const auth = getAuth(app);