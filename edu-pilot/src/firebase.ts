// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC1mxPN1BEDtb5q_HxAHqDzuEvW82TYgpI",
  authDomain: "edupilot-1446b.firebaseapp.com",
  projectId: "edupilot-1446b",
  storageBucket: "edupilot-1446b.firebasestorage.app",
  messagingSenderId: "261644192124",
  appId: "1:261644192124:web:842ec2c29faa7c7988bcf9",
  measurementId: "G-N3TTWGC1S7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
const analytics = getAnalytics(app);