import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyCisZeEtSJYTjat4gCUei4taVnJYwG361Y",
  authDomain: "studyup2-cd10e.firebaseapp.com",
  projectId: "studyup2-cd10e",
  storageBucket: "studyup2-cd10e.firebasestorage.app",
  messagingSenderId: "530845484312",
  appId: "1:530845484312:web:05320479b068d2adf64a6d",
  measurementId: "G-6787BX411N"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);