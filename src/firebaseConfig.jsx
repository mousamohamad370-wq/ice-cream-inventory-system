// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgEKqFvVk5_WN8SgvGdT-s5XqrOd4r2VE",
  authDomain: "inventory-iceream.firebaseapp.com",
  projectId: "inventory-iceream",
  storageBucket: "inventory-iceream.firebasestorage.app",
  messagingSenderId: "458649469014",
  appId: "1:458649469014:web:378184ec5a9a407901fbf7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const BRANCHES = [
  "Aley",
  "Saida",
  "Sour",
  "Nabatieh",
  "Bhamdoun",
  "Abra",
  "Shiyeh",
  "Shweyfat",
  "Batroun",
  "Marwanieh",
];

export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);