// ============================================================
// FIREBASE CONFIGURATION
// Apna Firebase project ka config yahan paste karo
// Steps: https://console.firebase.google.com
//   1. New Project banao: "janta-hotel"
//   2. Web App add karo (</>)
//   3. Neeche diya config replace karo
//   4. Authentication > Sign-in method > Email/Password enable karo
//   5. Firestore Database create karo (Start in test mode)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔴 APNA CONFIG YAHAN REPLACE KARO:
const firebaseConfig = {
  apiKey: "AIzaSyCnAlG-Y5LjJYdUDk57IQ9KeT1IYQw9OJQ",
  authDomain: "janta-hotal.firebaseapp.com",
  projectId: "janta-hotal",
  storageBucket: "janta-hotal.firebasestorage.app",
  messagingSenderId: "977412816277",
  appId: "1:977412816277:web:90f27c00d80c7d94e34a9c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Hotel ka naam (settings mein change kar sakte ho)
export const HOTEL_NAME = "Janta Sweets Restaurant & Hotal";
export const HOTEL_GSTIN = "08AFFPR7471G2Z1";
export const HOTEL_PHONE = "+91 9414863285";
export const HOTEL_ADDRESS = "Jayal, Nagour, Rajasthan";
