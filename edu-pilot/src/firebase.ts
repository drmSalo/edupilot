import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC1mxPN1BEDtb5q_HxAHqDzuEvW82TYgpI",
  authDomain: "edupilot-1446b.firebaseapp.com",
  projectId: "edupilot-1446b",
  storageBucket: "edupilot-1446b.appspot.com", // Korrigierter Bucket-Name
  messagingSenderId: "261644192124",
  appId: "1:261644192124:web:842ec2c29faa7c7988bcf9",
  measurementId: "G-N3TTWGC1S7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app); // ✅ HIER hinzugefügt

const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Failed to set Firebase persistence:", err);
});
