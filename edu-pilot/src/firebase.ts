// src/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { isSupported as analyticsIsSupported, getAnalytics, type Analytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

// Optional: aus .env lesen, fallback auf harte Werte
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY ?? "AIzaSyC1mxPN1BEDtb5q_HxAHqDzuEvW82TYgpI",
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN ?? "edupilot-1446b.firebaseapp.com",
  projectId: import.meta.env.VITE_FB_PROJECT_ID ?? "edupilot-1446b",
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET ?? "edupilot-1446b.appspot.com",
  messagingSenderId: import.meta.env.VITE_FB_MSG_SENDER_ID ?? "261644192124",
  appId: import.meta.env.VITE_FB_APP_ID ?? "1:261644192124:web:842ec2c29faa7c7988bcf9",
  measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID ?? "G-N3TTWGC1S7",
};

// HMR-safe Initialisierung
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Dienste
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth + Persistenz
export const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Failed to set Firebase persistence:", err);
});

// Google Provider (bessere UX)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account", // zwingt Kontowahl
});

// Analytics nur, wenn unterstützt + Browser
export let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  try {
    if (await analyticsIsSupported()) {
      analytics = getAnalytics(app);
    }
  } catch {
    // still – keine harten Fehler in SSR/Tests
    analytics = null;
  }
}
