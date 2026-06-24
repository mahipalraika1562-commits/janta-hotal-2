import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

export const HOTEL_NAME = "Janta Hotel";
export const HOTEL_GSTIN = "08XXXXX1234X1Z5";
export const HOTEL_PHONE = "+91 98765 43210";
export const HOTEL_ADDRESS = "Main Road, Your City, Rajasthan";
