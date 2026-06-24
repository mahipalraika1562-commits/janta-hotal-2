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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Hotel ka naam (settings mein change kar sakte ho)
export const HOTEL_NAME = "Janta Hotel";
export const HOTEL_GSTIN = "08XXXXX1234X1Z5";
export const HOTEL_PHONE = "+91 98765 43210";
export const HOTEL_ADDRESS = "Main Road, Your City, Rajasthan";
